// Password visibility toggle
export function initPasswordVisibility() {
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.addEventListener("click", togglePasswordVisibility);
  });

  function togglePasswordVisibility(e) {
    const wrapper = e.currentTarget.closest(".password-wrapper");
    const input = wrapper.querySelector(".form-input");
    const eyeIcon = wrapper.querySelector(".eye-icon");
    const eyeSlashIcon = wrapper.querySelector(".eye-slash-icon");
    const isShowing = input.type === "text";

    // Toggle input type
    input.type = isShowing ? "password" : "text";

    // Toggle icons
    eyeIcon.style.display = isShowing ? "block" : "none";
    eyeSlashIcon.style.display = isShowing ? "none" : "block";

    // Update ARIA
    e.currentTarget.setAttribute(
      "aria-label",
      isShowing ? "Show password" : "Hide password"
    );
  }
}
