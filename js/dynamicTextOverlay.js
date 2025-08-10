document.addEventListener("DOMContentLoaded", () => {
  const textOverlay = document.getElementById("text_overlay_container");
  if (!textOverlay) return;

  const projectContainers = document.querySelectorAll(".project_container");
  if (!projectContainers.length) return;

  const projectTexts = {
    LOTTOFPRINTS: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Pellentesque rhoncus mi ut orci interdum, id facilisis ipsum lacinia.",
      "Aenean eleifend felis ut urna blandit, at faucibus leo aliquam.",
      "Vestibulum vitae ipsum vel velit iaculis tincidunt.",
      "Duis quis nulla sit amet est varius accumsan.",
      "Mauris bibendum lacus auctor eros gravida, sit amet tincidunt lorem tempor.",
      "Integer ut sapien at diam cursus vulputate.",
      "Etiam id risus id velit consequat gravida.",
      "Curabitur eget tellus sed mi facilisis convallis.",
      "Phasellus viverra erat sed metus luctus posuere.",
      "Donec sollicitudin nisl at lorem posuere, in aliquam ipsum gravida.",
      "Sed vulputate arcu id sem interdum, vel iaculis tortor volutpat."
    ].join(" "),
    SYNTHETIC_ORGANIC: [
      "Quisque ut lectus non nunc porttitor semper.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed feugiat sapien non massa pretium, sit amet iaculis nibh finibus.",
      "Aliquam maximus justo ac lectus consectetur tempor.",
      "Morbi accumsan lacus eu turpis tincidunt, id vehicula nibh fermentum.",
      "Suspendisse potenti.",
      "Mauris scelerisque ligula non purus tempus, at tempus orci semper.",
      "Praesent posuere est in augue aliquet, vitae ultricies felis euismod.",
      "Fusce vitae arcu at lorem eleifend interdum.",
      "Nullam tempor erat sed neque tristique, nec rhoncus neque malesuada.",
      "Curabitur hendrerit risus vel porta posuere.",
      "Vestibulum vehicula magna eget lectus volutpat, in malesuada nibh commodo.",
      "Nam tristique magna ac risus fermentum ullamcorper."
    ].join(" "),
    SENS_UNIK: [
      "Integer porta elit quis libero elementum.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Nullam sagittis velit sed sapien dignissim, quis ultrices metus cursus.",
      "Donec venenatis magna et sem dapibus, sed lacinia ligula viverra.",
      "Proin commodo nisl ac neque laoreet maximus.",
      "Cras ornare lectus at odio blandit, quis gravida arcu aliquet.",
      "Aenean auctor mi nec nisi consequat, eu sollicitudin eros mattis.",
      "Morbi in ligula a justo tempor tempor.",
      "Sed pharetra urna vitae dolor tristique, at molestie tellus suscipit.",
      "Ut id felis at nisl fringilla laoreet.",
      "Vivamus a enim vel enim ultricies tempor.",
      "Phasellus suscipit felis non ligula interdum, sit amet consectetur risus dictum.",
      "Etiam finibus lorem nec lacus pulvinar porttitor."
    ].join(" "),
    RLSH: [
      "Curabitur euismod lectus id sapien volutpat, quis pulvinar orci tempus.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed sed dui bibendum, maximus sapien vel, tempor orci.",
      "Praesent non neque posuere, consequat est vel, dapibus turpis.",
      "Fusce sagittis velit ac enim pretium, at cursus odio commodo.",
      "Nam suscipit odio a elit hendrerit, eu laoreet urna sodales.",
      "Integer luctus nunc ac sem ultricies, at scelerisque quam fringilla.",
      "In laoreet leo nec bibendum elementum.",
      "Maecenas interdum tortor non dui aliquam scelerisque.",
      "Pellentesque in enim quis purus tincidunt viverra.",
      "Suspendisse auctor tortor sit amet elit dignissim, at interdum tortor tincidunt.",
      "Duis porttitor ante at ipsum euismod, vitae blandit magna blandit."
    ].join(" "),
    Relay: [
      "Nam tempor, ipsum eu interdum lacinia, nibh mauris aliquet est, vitae convallis felis nibh non mauris.",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Vivamus egestas justo sit amet sagittis pulvinar.",
      "Phasellus faucibus lorem vitae viverra fringilla.",
      "Sed tristique metus sed lorem euismod, eget tincidunt mi elementum.",
      "Praesent vel nisi efficitur, pellentesque nisl vel, gravida libero.",
      "Aliquam a urna vel orci fermentum tincidunt.",
      "Curabitur auctor magna vitae turpis efficitur, a scelerisque tortor aliquam.",
      "Integer varius nisi non eros faucibus, quis imperdiet velit fermentum.",
      "Morbi porta urna vitae lacus ultricies, ut fermentum odio vulputate.",
      "Cras maximus odio nec risus varius, vitae rhoncus est efficitur.",
      "Aenean luctus purus sed lacinia hendrerit.",
      "Suspendisse convallis ante a sem tristique, eget molestie tortor efficitur.",
      "Donec sed sapien vitae purus bibendum bibendum.",
      "Etiam quis eros at leo blandit tempor."
    ].join(" ")
  };

  let currentText = "";
  let wordsVisible = true;
  let timeouts = [];

  const highlightWords = (text) => {
    const rawWords = text.split(/\s+/);
    const highlightCount = Math.min(rawWords.length, 3 + Math.floor(Math.random() * 5));
    const indices = new Set();

    while (indices.size < highlightCount) {
      const index = Math.floor(Math.random() * rawWords.length);
      if (rawWords[index].trim()) {
        indices.add(index);
      }
    }

    return rawWords
      .map((word, i) => {
        const content = word + (i < rawWords.length - 1 ? " " : "");
        return indices.has(i)
          ? `<span class="word highlight">${content}</span>`
          : `<span class="word">${content}</span>`;
      })
      .join("");
  };

  const setOverlayText = (projectName) => {
    const nextText = projectTexts[projectName] || "";
    if (nextText !== currentText) {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      textOverlay.innerHTML = nextText ? highlightWords(nextText) : "";
      currentText = nextText;
      wordsVisible = true;
    }
  };

  const toggleWords = () => {
    timeouts.forEach(clearTimeout);
    timeouts = [];

    const spans = Array.from(textOverlay.querySelectorAll('span.word:not(.highlight)'));
    if (!spans.length) return;

    const hiddenCount = spans.filter((s) => s.style.display === 'none').length;
    wordsVisible = hiddenCount === 0;

    const hide = wordsVisible;
    const targets = spans.filter((span) =>
      hide ? span.style.display !== 'none' : span.style.display === 'none'
    );

    const steps = targets.length;
    if (steps === 0) return;

    wordsVisible = !wordsVisible;
    const dt = 1000 / steps;

    targets.forEach((span, index) => {
      const id = setTimeout(() => {
        span.style.display = hide ? 'none' : 'inline';
      }, (index + 1) * dt);
      timeouts.push(id);
    });
  };

  textOverlay.addEventListener('click', toggleWords);

  const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
  const visibilityMap = new Map();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visibilityMap.set(entry.target, entry.intersectionRatio);
    });

    let mostVisible = null;
    let maxRatio = 0;

    visibilityMap.forEach((ratio, element) => {
      if (ratio > maxRatio) {
        maxRatio = ratio;
        mostVisible = element;
      }
    });

    if (mostVisible && maxRatio > 0) {
      setOverlayText(mostVisible.getAttribute("data-project"));
    } else {
      setOverlayText("");
    }
  }, { threshold: thresholds });

  projectContainers.forEach((container) => {
    visibilityMap.set(container, 0);
    observer.observe(container);
  });
});

