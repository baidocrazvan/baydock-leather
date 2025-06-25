export const isValidEmail = (email) => {
  const re = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(email);
};

export const isValidPassword = (password) => {
  const re = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/;
  return re.test(password);
};

export const isValidName = (name) => {
  const re = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,50}$/;
  return re.test(name);
};

export const isValidPhoneNumber = (phoneNumber) => {
  const re = /^\+40\d{1,10}$/;
  return re.test(phoneNumber);
};

export const isValidPostalCode = (postalCode) => {
  const re = /^\d{6}$/;
  return re.test(postalCode);
};
