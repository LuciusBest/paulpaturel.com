document.addEventListener("DOMContentLoaded", () => {
  const textOverlay = document.getElementById("text_overlay_container");
  if (!textOverlay) {
    console.error("Element with ID 'text_overlay_container' not found in the DOM.");
    return;
  }

  const projectContainers = document.querySelectorAll(".project_container");
  if (projectContainers.length === 0) {
    console.error("No elements with class 'project_container' found in the DOM.");
    return;
  }

  const projectTexts = {
    LOTTOFPRINTS: "Lottofprints Project",
    SYNTHETIC_ORGANIC: "Synthetic Organic Project",
    SENS_UNIK: "Sens Unik Project",
    RLSH: "RLSH Project",
    Relay: "Relay Project",
  };

  const updateTextOverlay = () => {
    let mostVisibleContainer = null;
    let maxVisibleArea = 0;

    console.log("Starting updateTextOverlay...");

    projectContainers.forEach((container) => {
      const rect = container.getBoundingClientRect();
      console.log(`Container: ${container.getAttribute("data-project")}, Rect:`, rect);

      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      console.log(`Visible Height for ${container.getAttribute("data-project")}: ${visibleHeight}`);

      if (visibleHeight > 0 && visibleHeight > maxVisibleArea) {
        maxVisibleArea = visibleHeight;
        mostVisibleContainer = container;
        console.log(`Most visible container updated to: ${container.getAttribute("data-project")}`);
      }
    });

    if (mostVisibleContainer) {
      const projectName = mostVisibleContainer.getAttribute("data-project");
      if (projectTexts[projectName]) {
        textOverlay.textContent = projectTexts[projectName];
        console.log(`Text overlay updated to: ${projectTexts[projectName]}`);
      } else {
        console.warn(`No matching text found for project: ${projectName}`);
      }
    } else {
      textOverlay.textContent = ""; // Clear text if no project is visible
      console.log("No visible container found. Clearing text overlay.");
    }
  };

  window.addEventListener("scroll", updateTextOverlay);
  updateTextOverlay(); // Initial call to set the text on page load
});