import Joi from "joi";

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.empty": "Password is required",
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*[0-9]).*$/) // At least one uppercase letter and one number
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least 1 uppercase letter and 1 number",
      "string.empty": "Password is required",
    }),
  cpassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match test2",
    "any.required": "Please confirm your password",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().max(100).required().messages({
    "string.email": "Invalid email format",
    "string.empty": "Email is required",
  }),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*[0-9]).*$/) // At least one uppercase letter and one number
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base":
        "Password must contain at least 1 uppercase letter and 1 number",
      "string.empty": "Password is required",
    }),
  cpassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
  }),
}).with("password", "cpassword");
