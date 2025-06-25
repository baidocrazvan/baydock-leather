// Helper dismiss flash function
function dismissFlash(flashElement) {
  if (!flashElement || flashElement.classList.contains("hide")) return;

  flashElement.classList.add("hide");

  // Remove element after "slideOut" animation completes
  const handleSlideOutEnd = (e) => {
    // Only remove flash element after the slideOut animation ends
    if (e.animationName === "slideOut") {
      flashElement.removeEventListener("animationend", handleSlideOutEnd);
      flashElement.remove();
    }
  };

  flashElement.addEventListener("animationend", handleSlideOutEnd);

  // Fallback removal
  setTimeout(() => {
    if (document.body.contains(flashElement)) {
      flashElement.remove();
    }
  }, 500); // Duration of slideOut + extra buffer
}

// Flash message handler
export function initFlashMessages() {
  // Handle all flash messages (user, admin, cart)
  const handleFlashMessages = (selector, autoDismiss = true) => {
    document.querySelectorAll(selector).forEach((flash) => {
      // Close button functionality
      const closeBtn =
        flash.querySelector(`${selector}__close`) ||
        flash.querySelector(".flash__close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => dismissFlash(flash));
      }

      // Auto-dismiss after 5 seconds if set to true
      if (autoDismiss) {
        setTimeout(() => dismissFlash(flash), 5000);
      }
    });
  };

  // Dismiss after 5 seconds for all except .flash-info
  handleFlashMessages(".flash", true);
  handleFlashMessages(".admin-flash", true);
  handleFlashMessages(".cart-notification", true);
  handleFlashMessages(".flash-info", false);
}
