// Shipping methods script
export function initShippingMethods() {
  // Get data from DOM attributes
  const dataEl = document.getElementById("checkout-data");
  let shippingMethods = [];
  let subtotal = 0;

  if (dataEl) {
    shippingMethods = JSON.parse(dataEl.getAttribute("data-shipping-methods"));
    subtotal = parseFloat(dataEl.getAttribute("data-cart-subtotal"));
  }

  const shippingMethodRadios = document.querySelectorAll(
    'input[name="shippingMethodId"]'
  );
  const shippingCostEl = document.getElementById("shipping-cost");
  const orderTotalEl = document.getElementById("order-total");

  // Convert shipping methods array to lookup object
  const methodsData = {};
  shippingMethods.forEach((method) => {
    methodsData[method.id] = method.base_price;
  });

  // Calculate and display initial shipping cost
  updateShippingCost();

  // Handle shipping method selection changes
  shippingMethodRadios.forEach((radio) => {
    radio.addEventListener("change", updateShippingCost);
  });

  function updateShippingCost() {
    const selectedMethod = document.querySelector(
      'input[name="shippingMethodId"]:checked'
    );
    if (!selectedMethod || !methodsData[selectedMethod.value]) return;

    let shippingCost = 0;
    if (subtotal < 100) {
      shippingCost = parseFloat(methodsData[selectedMethod.value]);
    }

    const total = subtotal + shippingCost;

    // Update displayed prices
    shippingCostEl.textContent =
      subtotal >= 100 ? "FREE" : formatPrice(shippingCost);
    orderTotalEl.textContent = formatPrice(total);
    // Update hidden form field
    const hiddenShippingInput = document.getElementById(
      "hiddenShippingMethodId"
    );
    if (hiddenShippingInput) {
      hiddenShippingInput.value = selectedMethod.value;
    }
  }

  function formatPrice(amount) {
    return "€" + parseFloat(amount).toFixed(2);
  }
}
