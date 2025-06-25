// Cart collapsible product breakdown
export function initCartProductBreakdown() {
  // Product breakdown toggle functionality
  const breakdownToggle = document.querySelector(".breakdown-toggle-btn");
  const productBreakdown = document.querySelector(".product-breakdown");

  if (breakdownToggle && productBreakdown) {
    breakdownToggle.addEventListener("click", function () {
      // Toggle visibility
      const isExpanded = productBreakdown.style.display === "flex";
      productBreakdown.style.display = isExpanded ? "none" : "flex";

      // Update button text and icon
      breakdownToggle.classList.toggle("expanded");
      breakdownToggle.querySelector("span").textContent = isExpanded
        ? "Show item details"
        : "Hide item details";

      // Animate the toggle
      if (!isExpanded) {
        productBreakdown.style.animation = "fadeIn 0.3s ease-out";
      }
    });
  }
}
