// Le JavaScript n'est plus nécessaire car l'édition est gérée nativement par contenteditable

const letter = document.querySelector(".letter");
const body = document.body;
const cursorStats = document.createElement("div");
cursorStats.className = "cursor-stats";
document.body.appendChild(cursorStats);
let opticalSize = 0; // Valeur par défaut pour l'optical size
let isHighContrast = false;

// Ajouter les transitions CSS
letter.style.transition =
  "font-size 0.3s ease-out, font-variation-settings 0.3s ease-out";

// Fonction pour mapper une valeur d'un intervalle à un autre
const map = (value, start1, stop1, start2, stop2) => {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
};

// Fonction debounce pour limiter la fréquence d'exécution
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Fonction pour ajuster la taille du texte
const adjustTextSize = () => {
  let fontSize = 30; // Taille maximale en vh
  letter.style.whiteSpace = "nowrap";

  // Réinitialiser la taille pour obtenir les bonnes dimensions
  letter.style.fontSize = `${fontSize}vh`;

  // Calculer les ratios pour la largeur et la hauteur
  const widthRatio = letter.scrollWidth / (window.innerWidth * 0.9);
  const heightRatio = letter.scrollHeight / (window.innerHeight * 0.9);

  // Utiliser le plus grand des deux ratios pour s'assurer que le texte rentre dans les deux dimensions
  const maxRatio = Math.max(widthRatio, heightRatio);

  if (maxRatio > 1) {
    fontSize = fontSize / maxRatio;
    letter.style.fontSize = `${fontSize}vh`;
  }

  // Vérification finale et ajustement si nécessaire
  if (fontSize < 5) {
    letter.style.whiteSpace = "normal";
    letter.style.fontSize = "5vh";
  }
};

// Version debounced de adjustTextSize
const debouncedAdjustTextSize = debounce(adjustTextSize, 300);

// Modifier la gestion du mouvement de la souris
body.addEventListener("mousemove", (e) => {
  // Créer une marge de 20px sur la droite et 50px sur la gauche
  const leftMargin = 50;
  const rightMargin = 20;
  const effectiveWidth = window.innerWidth - (leftMargin + rightMargin);

  // Calculer le pourcentage en tenant compte des marges asymétriques
  const xPercent = Math.max(
    0,
    Math.min(1, (e.clientX - leftMargin) / effectiveWidth)
  );
  const yPercent = e.clientY / window.innerHeight;

  const width = map(xPercent, 0, 1, 50, 300);
  const weight = map(yPercent, 0, 1, 100, 900);

  letter.style.fontVariationSettings = `'wdth' ${width}, 'wght' ${weight}, 'opsz' ${opticalSize}`;

  // Mettre à jour et positionner les stats
  cursorStats.style.left = `${e.clientX}px`;
  cursorStats.style.top = `${e.clientY}px`;
  cursorStats.textContent = `${Math.round(weight)}
${Math.round(opticalSize)}
${Math.round(width)}`;

  debouncedAdjustTextSize();
});

// Remplacer la gestion du clic par la gestion du scroll
let lastScrollTime = Date.now();
const scrollThrottle = 50; // ms entre chaque mise à jour

window.addEventListener("wheel", (e) => {
  const currentTime = Date.now();

  // Limiter la fréquence des mises à jour
  if (currentTime - lastScrollTime < scrollThrottle) return;
  lastScrollTime = currentTime;

  // Ajuster l'optical size en fonction du scroll
  opticalSize = Math.max(0, Math.min(100, opticalSize + e.deltaY * 0.2));

  // Déclencher un événement mousemove pour mettre à jour les variations
  const event = new MouseEvent("mousemove", {
    clientX: window.event.clientX,
    clientY: window.event.clientY,
  });
  body.dispatchEvent(event);
});

// Modifier les autres appels à adjustTextSize pour utiliser la version debounced
letter.addEventListener("input", debouncedAdjustTextSize);
window.addEventListener("resize", debouncedAdjustTextSize);
document.addEventListener("DOMContentLoaded", adjustTextSize); // Garder la version non-debounced pour l'initialisation

// Gestion de l'audio
const audio = document.getElementById("bgMusic");
audio.volume = 0.5;

// Fonction pour démarrer l'audio
const startAudio = () => {
  audio
    .play()
    .then(() => {
      console.log("Audio started successfully");
      document.removeEventListener("click", startAudio);
    })
    .catch((error) => {
      console.error("Audio start failed:", error);
    });
};

// Essayer de démarrer l'audio immédiatement
startAudio();

// Si ça ne marche pas, attendre une interaction utilisateur
document.addEventListener("click", startAudio);

const palettes = [
  {
    name: "power-signal",
    background: "#000000",
    color: "#0080FF",
  },
  {
    name: "monochrome-mix",
    background: "#FFFFFF",
    color: "#000000",
  },
  {
    name: "pop-peak",
    background: "#FFFFFF",
    color: "#FF0B0B",
  },
  {
    name: "studio-depth",
    background: "#848C76",
    color: "#1C1B1A",
  },
  {
    name: "mp3-shell",
    background: "#000000",
    color: "#E0E0E0",
  },
];

let currentPaletteIndex = 0;

body.addEventListener("click", (e) => {
  if (e.target.classList.contains("letter")) {
    return;
  }

  currentPaletteIndex = (currentPaletteIndex + 1) % palettes.length;
  const currentPalette = palettes[currentPaletteIndex];

  document.body.style.backgroundColor = currentPalette.background;
  document.body.style.color = currentPalette.color;
  document.body.setAttribute("data-theme", currentPalette.name);

  const letters = document.querySelectorAll(".letter");
  letters.forEach((letter) => {
    letter.style.textShadow =
      currentPalette.name === "power-signal"
        ? `0 0 15px ${currentPalette.color}`
        : "none";
  });
});

// Après la déclaration de letter
letter.spellcheck = false;
