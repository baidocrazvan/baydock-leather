export function initProductImageSwitcher() {
  const mainImage = document.querySelector(".product-main__image img");
  const thumbnails = document.querySelectorAll(".product-main__slideshow img");

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", () => {
      mainImage.src = thumbnail.src;
    });
  });
}
