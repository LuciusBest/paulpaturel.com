document.addEventListener("DOMContentLoaded", () => {
  const textOverlay = document.getElementById("text_overlay_container");
  if (!textOverlay) return;

  const projectContainers = document.querySelectorAll(".project_container");
  if (!projectContainers.length) return;

  const projectTexts = {
    LOTTOFPRINTS: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in ligula vitae mauris fermentum convallis. Sed porta eros ut sapien malesuada, non fermentum ipsum feugiat. Cras vitae neque vitae justo pulvinar tristique. Mauris a sem vitae nisl interdum suscipit. In volutpat magna vel mauris tempor, et pretium mi lobortis. Phasellus gravida tellus non dolor pharetra, quis tincidunt lorem dignissim. Donec sit amet quam ac augue commodo hendrerit. Suspendisse potenti. Praesent id nisl eget velit cursus pulvinar. Aliquam erat volutpat.`,
    SYNTHETIC_ORGANIC: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus a nibh vitae ipsum venenatis mattis. Nulla facilisi. Donec volutpat sem sed enim accumsan, at efficitur purus accumsan. Aenean ut metus varius, porttitor massa at, euismod risus. Nam eu dolor eget dui fringilla tincidunt. Quisque vel felis a mauris molestie laoreet. Proin at turpis at magna dignissim gravida. Sed blandit leo nec lorem luctus, ut tristique nisi fermentum. Mauris tincidunt urna nec lorem euismod, et pharetra erat tempor. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.`,
    SENS_UNIK: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean congue nunc ut semper ornare. Morbi consequat justo a quam aliquam, nec blandit nisl interdum. Integer non erat nec nulla volutpat interdum. Praesent ultricies sem at commodo viverra. Phasellus luctus enim vel nisi aliquet posuere. Suspendisse ut metus nec velit convallis auctor. Curabitur vulputate nunc ac metus pulvinar, non hendrerit mauris viverra. Nam bibendum ante nec vulputate varius. Vestibulum sit amet nunc eget est facilisis pellentesque. Etiam eu massa et arcu posuere lacinia.`,
    RLSH: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur ac ipsum ac ipsum bibendum feugiat. Sed ac nisi semper, condimentum lacus non, dictum mi. Integer dapibus velit sit amet ligula scelerisque, vitae bibendum metus ornare. Pellentesque id tortor ut ipsum malesuada cursus. Nunc lobortis dolor a erat consequat, nec rutrum dolor aliquam. Duis fermentum nisl a sapien auctor, vel finibus est rutrum. Quisque semper arcu eu mi molestie, vitae feugiat lacus finibus. Proin volutpat magna ut felis varius, et convallis erat maximus. Morbi vel ante gravida, pretium leo quis, pharetra ex. Nam faucibus mauris sit amet sodales porttitor.`,
    Relay: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce ut arcu id erat vulputate porta. Mauris finibus nisl nec mauris placerat, at tristique metus pulvinar. Donec euismod enim eget magna molestie suscipit. Ut vitae erat ut tortor dictum feugiat. Aenean blandit neque a ligula finibus vestibulum. Vestibulum sed libero sit amet augue auctor ultricies. Suspendisse eu justo venenatis, feugiat mauris non, sodales quam. In hac habitasse platea dictumst. Donec volutpat neque a orci porttitor fringilla. Cras in dui eget sem pulvinar aliquet. Sed tempor arcu at enim efficitur egestas.`,
  };

  let currentText = "";

  const setOverlayText = (projectName) => {
    const nextText = projectTexts[projectName] || "";
    if (nextText !== currentText) {
      textOverlay.textContent = nextText;
      currentText = nextText;
    }
  };

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

