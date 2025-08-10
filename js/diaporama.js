document.addEventListener("DOMContentLoaded", () => {
  const slideshows = document.querySelectorAll(".wrapper--diaporama .diapo-frame");

  slideshows.forEach(slideshow => {
    const images = slideshow.querySelectorAll("img");
    let index = 0;

    if (images.length === 0) return;

    images[index].classList.add("active");

    setInterval(() => {
      images[index].classList.remove("active");
      index = (index + 1) % images.length;
      images[index].classList.add("active");
    }, 3000);
  });
});
