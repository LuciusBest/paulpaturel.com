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

          project.addEventListener("scroll", () => {
            const scrollLeft = project.scrollLeft;
            const scrollWidth = project.scrollWidth - project.clientWidth;
            const progress = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;
            const currentIndex = Math.round(progress * (slides.length - 1)) + 1;
            pagination.textContent = `${currentIndex}/${slides.length}`;

            // Adjusted positioning to center the pagination text relative to screen width
            const offset = progress * 100; // percent from left
            const halfTextWidth = pagination.offsetWidth / footer.offsetWidth * 100 / 2; // text width as % of container
            const alignedOffset = Math.min(Math.max(offset - halfTextWidth, 0), 100 - halfTextWidth * 2);
            pagination.style.marginLeft = `${alignedOffset}%`;
          });
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
