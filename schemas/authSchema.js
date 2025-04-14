import Joi from "joi";

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email format",
      "string.empty": "Email is required"
    }),
    password: Joi.string()
      .min(8)
      .pattern(/[A-Z]/)
      .pattern(/[0-9]/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "string.pattern.base": "Password must contain at least 1 uppercase letter and 1 number",
        "string.empty": "Password is required"
      })
  });
  
  export const registerSchema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/)
      .required()
      .messages({
        "string.min": "First name must be at least 2 characters",
        "string.pattern.base": "First name cannot contain numbers or symbols",
        "string.empty": "First name is required"
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/)
      .required()
      .messages({
        "string.min": "Last name must be at least 2 characters",
        "string.pattern.base": "Last name cannot contain numbers or symbols",
        "string.empty": "Last name is required"
      }),
    email: Joi.string().email().max(100).required().messages({
      "string.email": "Invalid email format",
      "string.empty": "Email is required"
    }),
    password: Joi.string()
      .min(8)
      .pattern(/[A-Z]/)
      .pattern(/[0-9]/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "string.pattern.base": "Must contain 1 uppercase and 1 number",
        "string.empty": "Password is required"
      }),
    cpassword: Joi.any()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
        "any.required": "Please confirm your password"
      })
  });