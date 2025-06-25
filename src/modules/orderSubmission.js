// Order submission script, take values from address selection on page and pass them to form
export function initOrderSubmission() {
  const orderForm = document.querySelector(".order-submission");
  if (orderForm) {
    orderForm.addEventListener("submit", function () {
      document.getElementById("hiddenShippingAddressId").value =
        document.getElementById("shippingAddress").value;

      const billingSelect = document.getElementById("billingAddress");
      document.getElementById("hiddenBillingAddressId").value =
        billingSelect.value || document.getElementById("shippingAddress").value;
    });
  }
}
