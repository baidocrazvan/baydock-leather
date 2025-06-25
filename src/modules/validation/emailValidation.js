import { isValidEmail } from "./validators.js";
import { setError, setSuccess } from "./formHandlers.js";

export const validateEmailInputs = ({ email }) => {
  let isValid = true;
  if (!email.value.trim()) {
    setError(email, "Email is required");
    isValid = false;
  } else if (!isValidEmail(email.value)) {
    setError(email, "Email address is invalid");
    isValid = false;
  } else {
    setSuccess(email);
  }

  return isValid;
};
