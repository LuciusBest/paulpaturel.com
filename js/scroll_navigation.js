/*
  scroll_navigation.js
  - Gère l'indicateur de pagination horizontale par projet.
  - Quand un .project_container est visible à ≥ 50 %, affiche/crée un footer
    avec un compteur "courant/total" basé sur le défilement horizontal.
  - Met à jour le compteur et ajuste la marge pour centrer visuellement le texte
    par rapport à la largeur d'écran durant le défilement.
*/

document.addEventListener("DOMContentLoaded", () => {
  const projects = document.querySelectorAll(".project_container");

  const globalObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const project = entry.target;
          const slides = project.querySelectorAll(".slide");

          let footer = project.querySelector(".project-footer");

          if (!footer) {
            footer = document.createElement("div");
            footer.className = "project-footer";
            const pagination = document.createElement("span");
            pagination.className = "pagination";
            pagination.textContent = `1/${slides.length}`;
            footer.appendChild(pagination);
            project.appendChild(footer);
          }

          document.querySelectorAll('.project-footer').forEach(f => f.style.display = 'none');
          footer.style.display = 'flex';

          const pagination = footer.querySelector(".pagination");

          const update = () => {
            const scrollLeft = project.scrollLeft;
            const scrollWidth = project.scrollWidth - project.clientWidth;
            const progress = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;

            const currentIndex = Math.round(progress * (slides.length - 1)) + 1;
            pagination.textContent = `${currentIndex}/${slides.length}`;

            // Place pagination by pixels inside footer's content box
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

          project.addEventListener("scroll", update);
          window.addEventListener("resize", update);
          update();
        }
      });
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
