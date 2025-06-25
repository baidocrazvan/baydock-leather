// Checkout address selection script
export function initCheckoutAddress() {
  const shippingSelect = document.getElementById("shippingAddress");
  const billingSelect = document.getElementById("billingAddress");
  const updateBtn = document.getElementById("updateDefaultBtn");

  function checkForChange() {
    // Access the <option> selected value and check if the isShipping/isBilling has changed to false
    const shippingChanged =
      shippingSelect.options[shippingSelect.selectedIndex].dataset
        .isShipping === "false";
    const billingChanged =
      billingSelect.options[billingSelect.selectedIndex].dataset.isBilling ===
      "false";

    // Show update button if defaults changed
    updateBtn.style.display =
      shippingChanged || billingChanged ? "block" : "none";
  }
  if (shippingSelect && billingSelect) {
    shippingSelect.addEventListener("change", checkForChange);
    billingSelect.addEventListener("change", checkForChange);
  }
}

// Checkout page script for showing address summary
export function initShowAddressSummary() {
  // Update address summary
  function updateAddressSummary(selectElement, summaryElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const addressData = JSON.parse(selectedOption.getAttribute("data-address"));

    summaryElement.innerHTML = `
      <div class="address-card">
        <p><strong>${addressData.first_name} ${addressData.last_name}</strong></p>
        <p>${addressData.address}</p>
        <p>${addressData.city}, ${addressData.county}</p>
        <p>${addressData.country}, ${addressData.postal_code}</p>
        <p>Phone: ${addressData.phone_number}</p>
      </div>
    `;
  }

  // Initialize and set up event listeners
  const shippingSelect = document.getElementById("shippingAddress");
  const billingSelect = document.getElementById("billingAddress");
  const shippingSummary = document.getElementById("shippingAddressSummary");
  const billingSummary = document.getElementById("billingAddressSummary");

  if (shippingSelect && shippingSummary) {
    updateAddressSummary(shippingSelect, shippingSummary);
    shippingSelect.addEventListener("change", () =>
      updateAddressSummary(shippingSelect, shippingSummary)
    );
  }

  if (billingSelect && billingSummary) {
    updateAddressSummary(billingSelect, billingSummary);
    billingSelect.addEventListener("change", () =>
      updateAddressSummary(billingSelect, billingSummary)
    );
  }
}
