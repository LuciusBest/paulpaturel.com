// Make the Camille Leprince video clickable and stop global overlay click actions
// - On click: go to camilleleprince.fr in the same tab
// - Prevent propagation to avoid triggering bio/full-text toggles

document.addEventListener('DOMContentLoaded', () => {
  const camilleVideo =
    document.querySelector('.project_container[data-project-key="CamilleLeprinceWEB"] video') ||
    document.querySelector('.project_container[data-project="CamilleLeprinceWEB"] video');
  if (!camilleVideo) return;

  const goToCamille = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.open('https://www.camilleleprince.fr', '_blank', 'noopener');
  };

  // Click and key activation for accessibility
  camilleVideo.addEventListener('click', goToCamille);

  // Prevent any mousedown/up bubbling that could be listened to elsewhere
  ['mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach((evt) => {
    camilleVideo.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
  });
});
