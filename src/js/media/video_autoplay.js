/*
  video_autoplay.js
  - Lance automatiquement les vidéos avec l'attribut "autoplay" lorsqu'elles entrent dans le viewport.
  - Utilise IntersectionObserver (seuil 0,1) pour détecter la visibilité.
  - Appelle HTMLMediaElement.play() et ignore sans erreur les blocages de politique navigateur.
*/

document.addEventListener("DOMContentLoaded", () => {
  const videos = document.querySelectorAll("video[autoplay]");

  // Renforce les exigences d'autoplay pour Safari (iOS/macOS)
  // - muted et playsinline doivent être à la fois en attribut et en propriété
  // - webkit-playsinline aide sur iOS plus anciens
  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    // Précharge léger pour éviter les blocages de lecture sur Safari
    if (!video.hasAttribute("preload")) {
      video.setAttribute("preload", "metadata");
    }

    // Si les métadonnées ne sont pas prêtes, recharge proprement
    if (video.readyState < 1 /* HAVE_METADATA */) {
      try { video.load(); } catch {}
    }
  });

  const tryPlay = (video) => {
    // Essayez de lire, ignorez silencieusement si bloqué
    const p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          if (video.muted !== true) video.muted = true; // garde muet pour autoriser autoplay
          tryPlay(video);
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "50px 0px 50px 0px", // amorce légèrement avant affichage
    }
  );

  videos.forEach((video) => {
    // Relance quand la vidéo devient lisible (Safari peut exiger readiness)
    const onReady = () => {
      // Ne tente de jouer que si visible
      // entry.isIntersecting n'est pas dispo ici; on teste via getBoundingClientRect minimalement
      const rect = video.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < (window.innerHeight || document.documentElement.clientHeight);
      if (inView) {
        tryPlay(video);
      }
    };
    video.addEventListener("loadeddata", onReady, { passive: true });
    video.addEventListener("canplay", onReady, { passive: true });

    observer.observe(video);
  });

  // Optionnel: pause tout quand l'onglet est caché (économie d'énergie)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      videos.forEach((v) => { if (!v.paused) v.pause(); });
    } else {
      videos.forEach((v) => {
        const rect = v.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < (window.innerHeight || document.documentElement.clientHeight);
        if (inView) tryPlay(v);
      });
    }
  });
});
