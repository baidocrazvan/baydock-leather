import {
  isValidName,
  isValidPhoneNumber,
  isValidPostalCode,
} from "./validators.js";
import { setError, setSuccess } from "./formHandlers.js";

export const validateAddressInputs = (inputs) => {
  const {
    firstName,
    lastName,
    address,
    city,
    county,
    phoneNumber,
    postalCode,
  } = inputs;
  let isValid = true;

  if (!firstName.value.trim()) {
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

  if (!lastName.value.trim()) {
    setError(lastName, "Last name is required");
    isValid = false;
  } else if (lastName.value.trim().length < 2) {
    setError(lastName, "Last name needs to be at least 2 characters long.");
    isValid = false;
  } else if (!isValidName(lastName.value)) {
    setError(lastName, "Names cannot contain numbers or symbols");
    isValid = false;
  } else {
    setSuccess(lastName);
  }

  if (!address.value.trim()) {
    setError(address, "Address is required");
    isValid = false;
  } else if (address.value.trim().length < 2) {
    setError(address, "Address needs to be longer than 2 characters");
    isValid = false;
  } else if (address.value.trim().length > 50) {
    setError(address, "Address cannot be longer than 50 characters");
    isValid = false;
  } else {
    setSuccess(address);
  }

  if (!city.value.trim()) {
    setError(city, "City name is required");
    isValid = false;
  } else if (city.value.trim().length < 2) {
    setError(city, "City name needs to be longer than 2 characters");
    isValid = false;
  } else if (city.value.trim().length > 32) {
    setError(city, "City name cannot exceed 32 characters");
    isValid = false;
  } else {
    setSuccess(city);
  }

  if (!county.value.trim()) {
    setError(county, "County name is required");
    isValid = false;
  } else if (county.value.trim().length < 2) {
    setError(county, "County name needs to be longer than 2 characters");
    isValid = false;
  } else if (county.value.trim().length > 32) {
    setError(county, "County name cannot exceed 32 characters");
    isValid = false;
  } else {
    setSuccess(county);
  }

  if (!phoneNumber.value.trim()) {
    setError(phoneNumber, "Valid mobile phone number is required");
    isValid = false;
  } else if (!isValidPhoneNumber(phoneNumber.value)) {
    setError(
      phoneNumber,
      "Phone number must start with +40 and be a valid Romanian mobile phone number"
    );
    isValid = false;
  } else {
    setSuccess(phoneNumber);
  }

  if (!postalCode.value.trim()) {
    setError(postalCode, "Postal code is required");
    isValid = false;
  } else if (!isValidPostalCode(postalCode.value)) {
    setError(postalCode, "Valid 6-character postal code is required");
    isValid = false;
  } else {
    setSuccess(postalCode);
  }

  return isValid;
};
