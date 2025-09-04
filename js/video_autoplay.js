/*
  video_autoplay.js
  - Lance automatiquement les vidéos avec l'attribut "autoplay" lorsqu'elles entrent dans le viewport.
  - Utilise IntersectionObserver (seuil 0,1) pour détecter la visibilité.
  - Appelle HTMLMediaElement.play() et ignore sans erreur les blocages de politique navigateur.
*/

document.addEventListener("DOMContentLoaded", () => {
  const videos = document.querySelectorAll("video[autoplay]");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {}); // force la relance si autorisée
      }
    });
  }, {
    threshold: 0.1
  });

  videos.forEach(video => {
    observer.observe(video);
  });
});
