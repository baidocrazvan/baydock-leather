// Product page size selector for belts
export function initSizeSelector() {
  if (document.getElementById("size-select")) {
    document
      .getElementById("size-select")
      .addEventListener("submit", function (e) {
        const sizeSelect = document.getElementById("belt-size");
        if (!sizeSelect.value) {
          e.preventDefault();
          sizeSelect.setCustomValidity("Please select a size");
          sizeSelect.reportValidity();
        }
      });
  }
}
