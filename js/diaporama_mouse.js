/*
  diaporama_mouse.js
  - Sélection d'image pilotée par la position de la souris pour chaque ".wrapper--diaporama .diapo-frame".
  - Projette la position horizontale du curseur sur l'index d'image et alterne
    la classe "active" pour afficher l'image correspondante.
  - Initialise en supposant le curseur centré à l'écran.
*/

document.addEventListener("DOMContentLoaded", () => {
  const diaporamas = document.querySelectorAll(".wrapper--diaporama .diapo-frame");

  diaporamas.forEach((slideshow) => {
    const images = slideshow.querySelectorAll("img");
    if (images.length === 0) return;

    let lastIndex = -1;

    function emitChange(index) {
      // Dispatch a bubbling event so outer scripts (pagination) can react
      const ev = new CustomEvent("diapochange", {
        bubbles: true,
        detail: {
          index, // 0-based
          total: images.length,
          source: "mouse",
        },
      });
      slideshow.dispatchEvent(ev);
    }

    function applyActive(index) {
      images.forEach((img, i) => {
        const isActive = i === index;
        img.classList.toggle("active", isActive);
        if (isActive) {
          img.setAttribute("aria-current", "true");
        } else {
          img.removeAttribute("aria-current");
        }
      });
    }

    function updateFromMouse(x) {
      const rect = slideshow.getBoundingClientRect();
      const relativeX = x - rect.left;
      const percent = Math.max(0, Math.min(1, rect.width > 0 ? relativeX / rect.width : 0));
      const rawIndex = Math.floor(percent * images.length);
      const index = Math.max(0, Math.min(images.length - 1, rawIndex));

      if (index !== lastIndex) {
        lastIndex = index;
        applyActive(index);
        emitChange(index);
      }
    }

    // Ensure there is a single active image at start (mouse assumed centered)
    const initialX = window.innerWidth / 2;
    updateFromMouse(initialX);

    // Track mouse globally so the diaporama reacts as the cursor moves
    window.addEventListener("mousemove", (e) => {
      updateFromMouse(e.clientX);
    });
  });
});
