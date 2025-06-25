import { isValidPassword } from "./validators.js";
import { setError, setSuccess } from "./formHandlers.js";

export const validatePasswordInputs = (inputs) => {
  const { password, confirmPassword } = inputs;
  let isValid = true;

  if (!password.value) {
    setError(password, "Password is required");
    isValid = false;
  } else if (password.value.length < 8) {
    setError(password, "Password must be at least 8 characters long");
    isValid = false;
  } else if (!isValidPassword(password.value)) {
    setError(password, "Password must contain an uppercase and a number");
    isValid = false;
  } else {
    setSuccess(password);
  }

  if (!confirmPassword.value) {
    setError(confirmPassword, "Confirmation password is required");
    isValid = false;
  } else if (password.value !== confirmPassword.value) {
    setError(confirmPassword, "Confirmation password does not match password");
    isValid = false;
  } else {
    setSuccess(confirmPassword);
  }

  return isValid;
};
