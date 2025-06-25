import {
  validateLoginInputs,
  validateRegisterInputs,
} from "./authValidation.js";
import { validateAddressInputs } from "./addressValidation.js";
import { validateEmailInputs } from "./emailValidation.js";
import { validatePasswordInputs } from "./passwordValidation.js";
import { validateResetInputs } from "./resetValidation.js";

export const initFormValidations = () => {
  // Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    loginForm.addEventListener("submit", (e) => {
      if (
        !validateLoginInputs({
          email: email,
          password: password,
        })
      ) {
        e.preventDefault();
      }
    });
  }

  // Register form
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    const inputs = {
      email: document.getElementById("email"),
      password: document.getElementById("password"),
      confirmPassword: document.getElementById("cpassword"),
      firstName: document.getElementById("firstName"),
      lastName: document.getElementById("lastName"),
    };

    registerForm.addEventListener("submit", (e) => {
      if (!validateRegisterInputs(inputs)) {
        e.preventDefault();
      }
    });
  }

  // Address Form
  const addressForm = document.getElementById("addressForm");
  if (addressForm) {
    const inputs = {
      firstName: document.getElementById("firstName"),
      lastName: document.getElementById("lastName"),
      address: document.getElementById("address"),
      city: document.getElementById("city"),
      county: document.getElementById("county"),
      phoneNumber: document.getElementById("phoneNumber"),
      postalCode: document.getElementById("postalCode"),
    };

    addressForm.addEventListener("submit", (e) => {
      if (!validateAddressInputs(inputs)) {
        e.preventDefault();
      }
    });
  }

  // Forgot Password form
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  if (forgotPasswordForm) {
    const email = document.getElementById("email");

    forgotPasswordForm.addEventListener("submit", (e) => {
      if (!validateEmailInputs({ email: email })) {
        e.preventDefault();
      }
    });
  }

  // Reset password form
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  if (resetPasswordForm) {
    const inputs = {
      password: document.getElementById("password"),
      confirmPassword: document.getElementById("cpassword"),
    };

    resetPasswordForm.addEventListener("submit", (e) => {
      if (!validateResetInputs(inputs)) {
        e.preventDefault();
      }
    });
  }

  // Change Password form
  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    const inputs = {
      password: document.getElementById("password"),
      confirmPassword: document.getElementById("cpassword"),
    };

    passwordForm.addEventListener("submit", (e) => {
      if (!validatePasswordInputs(inputs)) {
        e.preventDefault();
      }
    });
  }
};
