// Quantity selector logic
export function initQuantitySelector() {
  // Handle both product page and cart page selectors
  const quantitySelectors = document.querySelectorAll(`
    .item-update .quantity-selector,
    #size-select .quantity-selector
  `);

  quantitySelectors.forEach((selector) => {
    const minusBtn = selector.querySelector(".quantity-btn.minus");
    const plusBtn = selector.querySelector(".quantity-btn.plus");
    const quantityInput = selector.querySelector(".quantity-input");
    const form = selector.closest("form");
    const updateIconBtn = form?.querySelector(".update-icon-btn");

    if (!minusBtn || !plusBtn || !quantityInput) return;

    const max = parseInt(quantityInput.max) || 10;
    const initialValue = parseInt(quantityInput.value);

    // Store initial value
    quantityInput.dataset.initialValue = initialValue;

    function checkForChanges() {
      const currentValue = parseInt(quantityInput.value);
      if (updateIconBtn) {
        updateIconBtn.hidden = currentValue === initialValue;
      }
      toggleButtons();
    }

    minusBtn.addEventListener("click", () => {
      let value = parseInt(quantityInput.value);
      if (value > 1) {
        quantityInput.value = value - 1;
        checkForChanges();
      }
    });

    plusBtn.addEventListener("click", () => {
      let value = parseInt(quantityInput.value);
      if (value < max) {
        quantityInput.value = value + 1;
        checkForChanges();
      }
    });

    quantityInput.addEventListener("change", () => {
      let value = parseInt(quantityInput.value);
      if (isNaN(value) || value < 1) value = 1;
      if (value > max) value = max;
      quantityInput.value = value;
      checkForChanges();
    });

    function toggleButtons() {
      minusBtn.disabled = parseInt(quantityInput.value) <= 1;
      plusBtn.disabled = parseInt(quantityInput.value) >= max;
    }

    toggleButtons();
  });
}
