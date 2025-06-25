import { isValidEmail, isValidPassword, isValidName } from "./validators.js";
import { setError, setSuccess } from "./formHandlers.js";

export const validateLoginInputs = ({ email, password }) => {
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

  if (!password.value.trim()) {
    setError(password, "Password is required");
    isValid = false;
  } else {
    setSuccess(password);
  }

  return isValid;
};

export const validateRegisterInputs = (inputs) => {
  const { email, password, confirmPassword, firstName, lastName } = inputs;
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

  if (!firstName.value) {
    setError(firstName, "First name is required");
    isValid = false;
  } else if (firstName.value.length < 2) {
    setError(firstName, "First name needs to be at least 2 characters long.");
    isValid = false;
  } else if (!isValidName(firstName.value)) {
    setError(firstName, "Names cannot contain numbers or symbols");
    isValid = false;
  } else {
    setSuccess(firstName);
  }

  if (!lastName.value) {
    setError(lastName, "Last name is required");
    isValid = false;
  } else if (lastName.value.length < 2) {
    setError(lastName, "Last name needs to be at least 2 characters long.");
    isValid = false;
  } else if (!isValidName(lastName.value)) {
    setError(lastName, "Names cannot contain numbers or symbols");
    isValid = false;
  } else {
    setSuccess(lastName);
  }

  return isValid;
};
