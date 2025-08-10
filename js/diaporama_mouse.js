document.addEventListener("DOMContentLoaded", () => {
  const diaporamas = document.querySelectorAll(".wrapper--diaporama .diapo-frame");

  diaporamas.forEach(slideshow => {
    const images = slideshow.querySelectorAll("img");
    if (images.length === 0) return;

    function updateFromMouse(x) {
      const rect = slideshow.getBoundingClientRect();
      const relativeX = x - rect.left;
      const percent = Math.max(0, Math.min(1, relativeX / rect.width));
      const index = Math.floor(percent * images.length);

      images.forEach((img, i) => {
        img.classList.toggle("active", i === index);
      });
    }

    // Initialisation (souris au centre)
    updateFromMouse(window.innerWidth / 2);

    window.addEventListener("mousemove", (e) => {
      updateFromMouse(e.clientX);
    });
  });
});
