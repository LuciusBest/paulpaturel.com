/*
  scroll_navigation.js
  - Indicateur de pagination horizontal unique et persistant.
  - Suit le .project_container le plus visible (≥ 50 %) et met à jour
    le compteur "courant/total" en fonction du défilement horizontal.
  - Conserve le même élément DOM pour la pagination afin de bénéficier
    d'une transition latérale fluide lors du passage d'un projet à l'autre.
*/

document.addEventListener("DOMContentLoaded", () => {
  const projects = document.querySelectorAll(".project_container");
  if (!projects.length) return;

  // Crée un footer global et persistant (un seul élément pour tous les projets)
  const footer = document.createElement("div");
  footer.className = "project-footer";
  const pagination = document.createElement("span");
  pagination.className = "pagination";
  pagination.textContent = "1/1"; // valeur initiale sans conséquence
  footer.appendChild(pagination);
  document.body.appendChild(footer);
  footer.style.display = "none"; // visible après premier bind

  let activeProject = null;
  let activeSlides = [];
  let detachActiveScroll = null;

  const updateForActive = () => {
    if (!activeProject) return;

    const scrollLeft = activeProject.scrollLeft;
    const scrollWidth = activeProject.scrollWidth - activeProject.clientWidth;
    const progress = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;

    const currentIndex = Math.round(progress * (activeSlides.length - 1)) + 1;
    pagination.textContent = `${currentIndex}/${activeSlides.length}`;

    // Positionne la pagination en pixels à l'intérieur du footer
    const styles = getComputedStyle(footer);
    const padL = parseFloat(styles.paddingLeft) || 0;
    const padR = parseFloat(styles.paddingRight) || 0;
    const contentWidth = footer.clientWidth - padL - padR;
    const textWidth = pagination.offsetWidth;

    const center = progress * contentWidth;
    const left = Math.min(
      Math.max(center - textWidth / 2, 0),
      Math.max(contentWidth - textWidth, 0)
    );
    pagination.style.marginLeft = `${left}px`;
  };

  const bindProject = (project) => {
    // Détache proprement les écouteurs de l'ancien projet
    if (detachActiveScroll) detachActiveScroll();

    activeProject = project;
    activeSlides = Array.from(project.querySelectorAll(".slide"));

    // Attache les écouteurs au nouveau projet
    const onScroll = () => updateForActive();
    project.addEventListener("scroll", onScroll);
    const onResize = () => updateForActive();
    window.addEventListener("resize", onResize);

    detachActiveScroll = () => {
      project.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };

    // Déclenche une mise à jour immédiate pour animer la transition latérale
    updateForActive();
    footer.style.display = "flex";
  };

  // Suivi de la visibilité des projets pour choisir celui qui est le plus visible
  const ratios = new Map();
  projects.forEach(p => ratios.set(p, 0));

  const chooseMostVisible = () => {
    let best = { el: null, ratio: 0 };
    ratios.forEach((ratio, el) => {
      if (ratio > best.ratio) best = { el, ratio };
    });
    return best.el;
  };

  const globalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        ratios.set(entry.target, entry.intersectionRatio || 0);
      });

      const mostVisible = chooseMostVisible();
      if (mostVisible && mostVisible !== activeProject) {
        bindProject(mostVisible);
      } else if (!activeProject && mostVisible) {
        bindProject(mostVisible);
      }
    },
    {
      root: null,
      threshold: 0.5
    }
  );

  projects.forEach(project => {
    globalObserver.observe(project);
  });
});
