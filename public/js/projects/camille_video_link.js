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
    },
    {
      selector:
        '.project_container[data-project-key="LAMANT"] .slide:nth-of-type(2) .wrapper--centered img',
      url: 'https://soundcloud.com/stephane-capdenat-christy/lamant'
    }
  ];

  clickableProjects.forEach(({ selector, url }) => {
    const targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    const goToLink = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      window.open(url, '_blank', 'noopener');
    };

    targets.forEach((target) => {
      target.addEventListener('click', goToLink);
      ['mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach((evt) => {
        target.addEventListener(evt, (event) => event.stopPropagation(), { passive: true });
      });
    });
  });
});
