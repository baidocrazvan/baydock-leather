export const setError = (element, message) => {
  const inputControl = element.closest(".input-control");
  const errorDisplay = inputControl.querySelector(".error");

  errorDisplay.innerText = message;

  inputControl.classList.add("error");
  inputControl.classList.remove("success");
};

export const setSuccess = (element) => {
  const inputControl = element.closest(".input-control");
  const errorDisplay = inputControl.querySelector(".error");

  if (errorDisplay.textContent !== "") {
    errorDisplay.innerText = "";
    inputControl.classList.remove("error");
  }
};
