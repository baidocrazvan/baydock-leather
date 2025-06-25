// Script for products price filter and slider
export function initProductsFilter() {
  const minThumb = document.getElementById("min-range");
  const maxThumb = document.getElementById("max-range");
  const track = document.querySelector(".slider-track");
  const minPriceDisplay = document.querySelector(".min-price");
  const maxPriceDisplay = document.querySelector(".max-price");
  const minPriceInput = document.querySelector('input[name="min_price"]');
  const maxPriceInput = document.querySelector('input[name="max_price"]');
  const minGap = 5;
  const maxValue = 200;

  function updateSlider() {
    let minVal = parseInt(minThumb.value);
    let maxVal = parseInt(maxThumb.value);

    if (maxVal - minVal < minGap) {
      if (event.target === minThumb) {
        minThumb.value = maxVal - minGap;
        minVal = maxVal - minGap;
      } else {
        maxThumb.value = minVal + minGap;
        maxVal = minVal + minGap;
      }
    }

    // Update track
    const percent1 = (minVal / maxValue) * 100;
    const percent2 = (maxVal / maxValue) * 100;
    track.style.left = percent1 + "%";
    track.style.right = 100 - percent2 + "%";

    // Update display
    minPriceDisplay.textContent = `€${minVal}`;
    maxPriceDisplay.textContent = `€${maxVal}`;
    minPriceInput.value = minVal;
    maxPriceInput.value = maxVal;
  }

  if (minThumb && maxThumb) {
    minThumb.addEventListener("input", updateSlider);
    maxThumb.addEventListener("input", updateSlider);

    // Initialize
    updateSlider();
  }
}
