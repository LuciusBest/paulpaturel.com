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
