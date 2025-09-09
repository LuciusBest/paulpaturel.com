/*
  scroll_navigation.js
  - Global, sticky pagination that reflects the current position.
  - Syncs with native horizontal slide navigation (.slide scroll-snap) and
    mouse-driven diaporamas inside a slide (.diapo-frame via diapochange).
*/

document.addEventListener("DOMContentLoaded", () => {
  const projects = document.querySelectorAll(".project_container");
  if (!projects.length) return;

  // Persistent footer (single DOM node)
  const footer = document.createElement("div");
  footer.className = "project-footer";
  const pagination = document.createElement("span");
  pagination.className = "pagination";
  pagination.textContent = "1/1";
  footer.appendChild(pagination);
  document.body.appendChild(footer);
  footer.style.display = "none";

  // Current bindings/state
  let activeProject = null;
  let activeSlides = [];
  let detachProjectHandlers = null;

  let activeSlideEl = null;
  let detachSlideHandlers = null;

  // Single source of truth for display
  const state = {
    mode: "project", // 'project' for .slide index, 'diapo' for image index in .diapo-frame
    index: 0, // 0-based
    total: 1,
    progress: 0, // [0..1] used for horizontal positioning of the label
  };

  const render = () => {
    const current = Math.max(1, Math.min(state.total, state.index + 1));
    pagination.textContent = `${current}/${state.total}`;

    // Position inside footer according to progress
    const styles = getComputedStyle(footer);
    const padL = parseFloat(styles.paddingLeft) || 0;
    const padR = parseFloat(styles.paddingRight) || 0;
    const contentWidth = footer.clientWidth - padL - padR;
    const textWidth = pagination.offsetWidth;
    const center = (isFinite(state.progress) ? state.progress : 0) * contentWidth;
    const left = Math.min(
      Math.max(center - textWidth / 2, 0),
      Math.max(contentWidth - textWidth, 0)
    );
    pagination.style.marginLeft = `${left}px`;
  };

  const computeProjectProgress = () => {
    if (!activeProject) return 0;
    const scrollLeft = activeProject.scrollLeft;
    const scrollWidth = activeProject.scrollWidth - activeProject.clientWidth;
    return scrollWidth > 0 ? scrollLeft / scrollWidth : 0;
  };

  const bindSlide = (slideEl) => {
    // Cleanup previous slide handlers
    if (detachSlideHandlers) detachSlideHandlers();
    activeSlideEl = slideEl;

    // Decide mode based on presence of diaporama in this slide
    const diapo = slideEl.querySelector(".diapo-frame");
    const slideIndex = activeSlides.indexOf(slideEl);

    if (diapo) {
      // Diaporama mode: listen to diapochange events
      const onDiapoChange = (e) => {
        const { index, total } = e.detail || {};
        if (typeof index === "number" && typeof total === "number" && total > 0) {
          state.mode = "diapo";
          state.index = Math.max(0, Math.min(total - 1, index));
          state.total = total;
          state.progress = total > 1 ? state.index / (total - 1) : 0;
          render();
        }
      };

      diapo.addEventListener("diapochange", onDiapoChange);

      // Initialize from current active image if any
      const imgs = diapo.querySelectorAll("img");
      let activeIdx = 0;
      imgs.forEach((img, i) => {
        if (img.classList.contains("active")) activeIdx = i;
      });
      state.mode = "diapo";
      state.index = activeIdx;
      state.total = Math.max(1, imgs.length);
      state.progress = state.total > 1 ? state.index / (state.total - 1) : 0;
      render();

      detachSlideHandlers = () => {
        diapo.removeEventListener("diapochange", onDiapoChange);
      };
    } else {
      // Project mode: reflect slide index amongst siblings
      state.mode = "project";
      state.index = Math.max(0, slideIndex);
      state.total = Math.max(1, activeSlides.length);
      state.progress = computeProjectProgress();
      render();

      // Nothing to attach for the slide itself
      detachSlideHandlers = () => {};
    }
  };

  const bindProject = (project) => {
    // Cleanup previous project bindings
    if (detachProjectHandlers) detachProjectHandlers();

    activeProject = project;
    activeSlides = Array.from(project.querySelectorAll(".slide"));

    // Observe which slide is most visible inside this horizontal scroller
    const slideRatios = new Map();
    activeSlides.forEach((s) => slideRatios.set(s, 0));

    const chooseMostVisibleSlide = () => {
      let best = { el: null, ratio: 0 };
      slideRatios.forEach((ratio, el) => {
        if (ratio > best.ratio) best = { el, ratio };
      });
      return best.el;
    };

    const slideObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          slideRatios.set(entry.target, entry.intersectionRatio || 0);
        });
        const mostVisibleSlide = chooseMostVisibleSlide();
        if (mostVisibleSlide && mostVisibleSlide !== activeSlideEl) {
          bindSlide(mostVisibleSlide);
        } else if (!activeSlideEl && mostVisibleSlide) {
          bindSlide(mostVisibleSlide);
        }
      },
      { root: project, threshold: 0.6 }
    );

    activeSlides.forEach((s) => slideObserver.observe(s));

    // Also react to scroll/resize to keep progress updated in project mode
    const onScroll = () => {
      if (state.mode === "project") {
        state.progress = computeProjectProgress();
        // Estimate index from scroll position to keep current/total accurate while swiping
        if (activeSlides.length > 0) {
          const idx = Math.round(state.progress * (activeSlides.length - 1));
          state.index = Math.max(0, Math.min(activeSlides.length - 1, idx));
          state.total = activeSlides.length;
        }
        render();
      }
    };
    const onResize = () => render();
    project.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);

    // Initial state
    state.mode = "project";
    state.index = 0;
    state.total = Math.max(1, activeSlides.length);
    state.progress = computeProjectProgress();
    render();
    footer.style.display = "flex";

    detachProjectHandlers = () => {
      project.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (detachSlideHandlers) detachSlideHandlers();
      slideObserver.disconnect();
    };
  };

  // Choose most visible project in viewport
  const ratios = new Map();
  projects.forEach((p) => ratios.set(p, 0));

  const chooseMostVisibleProject = () => {
    let best = { el: null, ratio: 0 };
    ratios.forEach((ratio, el) => {
      if (ratio > best.ratio) best = { el, ratio };
    });
    return best.el;
  };

  const globalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target, entry.intersectionRatio || 0);
      });
      const mostVisible = chooseMostVisibleProject();
      if (mostVisible && mostVisible !== activeProject) {
        bindProject(mostVisible);
      } else if (!activeProject && mostVisible) {
        bindProject(mostVisible);
      }
    },
    { root: null, threshold: 0.5 }
  );

  projects.forEach((project) => globalObserver.observe(project));
});
