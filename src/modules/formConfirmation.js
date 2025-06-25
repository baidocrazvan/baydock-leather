export function initFormConfirmations() {
  // Handle forms
  document.querySelectorAll("form[data-confirm]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      // Listen for submit event
      if (!confirm(form.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });

  // Handle confirmable links
  document.querySelectorAll("a[data-confirm]").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (!confirm(link.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });
}
