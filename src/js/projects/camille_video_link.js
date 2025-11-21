document.addEventListener('DOMContentLoaded', () => {
  const clickableProjects = [
    {
      selector:
        '.project_container[data-project-key="CamilleLeprinceWEB"] video, .project_container[data-project="CamilleLeprinceWEB"] video',
      url: 'https://www.camilleleprince.fr'
    },
    {
      selector:
        '.project_container[data-project-key="GRIME_INDEX"] video, .project_container[data-project="GRIME_INDEX"] video, .project_container[data-project="Grime Index"] video',
      url: 'https://ecal.ch/fr/feed/projects/8428/modulat-2025-2/'
    }
  ];

  clickableProjects.forEach(({ selector, url }) => {
    const videoEl = document.querySelector(selector);
    if (!videoEl) return;

    const goToLink = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      window.open(url, '_blank', 'noopener');
    };

    videoEl.addEventListener('click', goToLink);
    ['mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach((evt) => {
      videoEl.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
    });
  });
});
