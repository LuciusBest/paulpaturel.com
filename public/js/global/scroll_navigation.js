/*
  scroll_navigation.js
  - Global, sticky pagination that reflects the current position.
  - Syncs with native horizontal slide navigation (.slide scroll-snap) and
    mouse-driven diaporamas inside a slide (.diapo-frame via diapochange).
*/

document.addEventListener("DOMContentLoaded", () => {
  const projects = document.querySelectorAll(".project_container");
  if (!projects.length) return;

  const mainContainer = document.querySelector(".main_container");

  const IDLE_CLASS = "ui-idle";
  const IDLE_DELAY = 3000;
  let idleTimer = null;

  const body = document.body;

  const clearIdleTimer = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const enterIdleState = () => {
    if (body && !body.classList.contains(IDLE_CLASS)) {
      body.classList.add(IDLE_CLASS);
    }
  };

  const scheduleIdleState = () => {
    clearIdleTimer();
    idleTimer = window.setTimeout(enterIdleState, IDLE_DELAY);
  };

  const exitIdleState = () => {
    if (body && body.classList.contains(IDLE_CLASS)) {
      body.classList.remove(IDLE_CLASS);
    }
    scheduleIdleState();
  };

  const onScrollActivity = () => {
    exitIdleState();
  };

  document.addEventListener("scroll", onScrollActivity, {
    capture: true,
    passive: true,
  });

  window.addEventListener("ui:activity", exitIdleState);

  scheduleIdleState();

  // Persistent footer (single DOM node)
  const footer = document.createElement("div");
  footer.className = "project-footer";
  const track = document.createElement("div");
  track.className = "project-footer-track";
  footer.appendChild(track);
  const pagination = document.createElement("span");
  pagination.className = "pagination";
  pagination.textContent = "1/1";
  track.appendChild(pagination);
  document.body.appendChild(footer);
  footer.style.display = "none";

  const verticalRail = document.createElement("div");
  verticalRail.className = "project-vertical-rail";
  const verticalIndicatorGroup = document.createElement("div");
  verticalIndicatorGroup.className = "vertical-indicator-group";
  const verticalProjectName = document.createElement("span");
  verticalProjectName.className = "vertical-project-name";
  verticalProjectName.textContent = "";
  const verticalIndex = document.createElement("span");
  verticalIndex.className = "vertical-index";
  verticalIndex.textContent = `1/${projects.length}`;
  verticalIndicatorGroup.appendChild(verticalProjectName);
  verticalIndicatorGroup.appendChild(verticalIndex);
  verticalRail.appendChild(verticalIndicatorGroup);
  document.body.appendChild(verticalRail);
  verticalRail.style.display = "none";

  const isProjectVisible = (project) => {
    if (!project) return false;
    if (project.classList.contains("is-filtered")) return false;
    if (project.offsetParent !== null) return true;
    try {
      const style = window.getComputedStyle(project);
      if (!style) return false;
      if (style.display === "none" || style.visibility === "hidden") return false;
    } catch (_) {
      return false;
    }
    return true;
  };

  const getVisibleProjects = () => Array.from(projects).filter(isProjectVisible);

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

  const verticalState = {
    index: 0,
    total: Math.max(1, getVisibleProjects().length || 0),
    progress: 0,
  };

  const tidy = (str) => String(str || "").replace(/\s+/g, " ").trim();

  const deriveProjectLabel = (projectEl) => {
    if (!projectEl) return "";
    const explicit =
      projectEl.getAttribute("data-project-label") ||
      projectEl.getAttribute("data-project-name");
    if (explicit) return tidy(explicit);
    const raw = tidy(projectEl.getAttribute("data-project"));
    if (!raw) return "";
    const hasSpace = /\s/.test(raw);
    const hasSeparator = /[-_]/.test(raw);
    let label = raw;
    if (!hasSpace || hasSeparator) {
      label = raw
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
      label = tidy(label);
      label = label
        .split(" ")
        .map((word) =>
          /^[A-Z0-9]+$/.test(word)
            ? word
            : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(" ");
    }
    return tidy(label);
  };

  const setProjectName = (label) => {
    const text = tidy(label);
    if (!text) {
      verticalProjectName.textContent = "";
      verticalProjectName.style.display = "none";
      verticalProjectName.setAttribute("aria-hidden", "true");
    } else {
      verticalProjectName.textContent = text;
      verticalProjectName.style.display = "inline-block";
      verticalProjectName.removeAttribute("aria-hidden");
    }
  };

  if (projects[0]) {
    setProjectName(deriveProjectLabel(projects[0]));
  }

  let rafScheduled = false;
  let cachedContentWidth = 0;
  let cachedRailHeight = 0;
  let cachedRailPaddingTop = 0;

  const recomputeFooterMetrics = () => {
    const styles = getComputedStyle(track);
    const padL = parseFloat(styles.paddingLeft) || 0;
    const padR = parseFloat(styles.paddingRight) || 0;
    cachedContentWidth = track.clientWidth - padL - padR;
  };

  const recomputeVerticalMetrics = () => {
    cachedRailHeight = verticalRail.clientHeight;
    try {
      const styles = getComputedStyle(verticalRail);
      cachedRailPaddingTop = parseFloat(styles.paddingTop) || 0;
    } catch (_) {
      cachedRailPaddingTop = 0;
    }
  };

  const updateHorizontalIndicator = () => {
    const current = Math.max(1, Math.min(state.total, state.index + 1));
    pagination.textContent = `${current}/${state.total}`;

    const contentWidth = cachedContentWidth || track.clientWidth;
    const textWidth = pagination.offsetWidth;
    const progress = isFinite(state.progress) ? state.progress : 0;
    const center = progress * contentWidth;
    const left = Math.min(
      Math.max(center - textWidth / 2, 0),
      Math.max(contentWidth - textWidth, 0)
    );
    pagination.style.left = `${left}px`;
  };

  const updateVerticalIndicator = () => {
    const current = Math.max(1, Math.min(verticalState.total, verticalState.index + 1));
    verticalIndex.textContent = `${current}/${verticalState.total}`;

    const railHeight = cachedRailHeight || verticalRail.clientHeight;
    const padTop = cachedRailPaddingTop;
    const indicatorHeight =
      verticalIndicatorGroup.offsetHeight || verticalIndex.offsetHeight;
    // Allow the indicator to travel so its bottom lines up with the rail's bottom edge.
    const usableHeight = Math.max(railHeight - padTop - indicatorHeight, 0);
    const progress = isFinite(verticalState.progress) ? verticalState.progress : 0;
    const top = progress * usableHeight;
    verticalIndicatorGroup.style.transform = `translateY(${top}px)`;
  };

  const render = () => {
    rafScheduled = false;
    updateHorizontalIndicator();
    updateVerticalIndicator();
  };

  const scheduleRender = () => {
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(render);
    }
  };

  const computeVerticalProgress = () => {
    if (!mainContainer) return 0;
    const scrollRange = mainContainer.scrollHeight - mainContainer.clientHeight;
    return scrollRange > 0 ? mainContainer.scrollTop / scrollRange : 0;
  };

  const updateVerticalFromScroll = () => {
    const visibleProjects = getVisibleProjects();
    const visibleCount = visibleProjects.length;
    verticalState.total = Math.max(1, visibleCount);
    verticalState.progress = computeVerticalProgress();
    if (visibleCount > 1) {
      const idx = Math.round(verticalState.progress * (visibleCount - 1));
      verticalState.index = Math.max(0, Math.min(visibleCount - 1, idx));
    } else {
      verticalState.index = 0;
    }
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
    setProjectName(deriveProjectLabel(project));
    const visibleProjects = getVisibleProjects();
    const totalVisible = visibleProjects.length;
    const projectIndex = visibleProjects.indexOf(project);
    verticalState.total = Math.max(1, totalVisible);
    if (projectIndex >= 0) {
      verticalState.index = projectIndex;
    } else {
      verticalState.index = Math.max(0, Math.min(verticalState.total - 1, verticalState.index));
    }
    verticalState.progress = computeVerticalProgress();
    render();

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
        scheduleRender();
      }
    };
    const onResize = () => {
      recomputeFooterMetrics();
      recomputeVerticalMetrics();
      updateVerticalFromScroll();
      scheduleRender();
    };
    project.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // Initial state
    state.mode = "project";
    state.index = 0;
    state.total = Math.max(1, activeSlides.length);
    state.progress = computeProjectProgress();
    recomputeFooterMetrics();
    if (verticalRail.style.display !== "block") {
      verticalRail.style.display = "block";
      recomputeVerticalMetrics();
    } else {
      recomputeVerticalMetrics();
    }
    render();
    footer.style.display = "block";
    recomputeFooterMetrics();

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
      if (!isProjectVisible(el)) return;
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
      updateVerticalFromScroll();
      scheduleRender();
    },
    { root: null, threshold: 0.5 }
  );

  projects.forEach((project) => globalObserver.observe(project));

  if (mainContainer) {
    const onMainScroll = () => {
      updateVerticalFromScroll();
      scheduleRender();
    };
    mainContainer.addEventListener("scroll", onMainScroll, { passive: true });
    updateVerticalFromScroll();
  }

  const onFilterChange = () => {
    const visibleProjects = getVisibleProjects();
    if (!visibleProjects.length) {
      activeProject = null;
      setProjectName("");
      verticalState.index = 0;
      verticalState.total = 1;
      verticalState.progress = 0;
      scheduleRender();
      return;
    }
    if (!activeProject || !isProjectVisible(activeProject)) {
      bindProject(visibleProjects[0]);
      return;
    }
    const idx = visibleProjects.indexOf(activeProject);
    if (idx >= 0) {
      verticalState.index = idx;
    }
    verticalState.total = Math.max(1, visibleProjects.length);
    verticalState.progress = computeVerticalProgress();
    recomputeVerticalMetrics();
    scheduleRender();
  };

  try {
    window.addEventListener("projects:filter-change", onFilterChange);
  } catch (_) {}

  onFilterChange();
});
