import Joi from "joi";

export const addressSchema = Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/)
      .required()
      .messages({
        "string.min": "First name must be at least 2 characters",
        "string.pattern.base": "First name cannot contain numbers or symbols",
        "string.empty": "First name is required",
        "any.required": "First name is required"
      }),
    lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/)
    .required()
    .messages({
      "string.min": "Last name must be at least 2 characters",
      "string.pattern.base": "Last name cannot contain numbers or symbols",
      "string.empty": "Last name is required",
      "any.required": "Last name is required"
    }),
    address: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      "string.min": "Address incomplete",
      "string.max": "Address is too long",
      "string.empty": "Address is required",
      "any.required": "Address is required"
    }),
    city: Joi.string()
    .min(2)
    .max(32)
    .required()
    .messages({
      "string.empty": "City is required",
      "string.min": "City name is too short",
      "string.max": "There are no cities longer than 32 characters",
      "any.required": "City is required"
    }),
    county: Joi.string()
    .min(2)
    .max(32)
    .required()
    .messages({
      "string.empty": "County is required",
      "string.min": "County name is too short",
      "string.max": "There are no county names longer than 32 characters",
      "any.required": "County is required",
    }),
    phoneNumber: Joi.string()
    .pattern(/^\+40\d{9}$/)
    .required()
    .messages({
      "string.empty": "Phone is required",
      "string.pattern.base": "Phone number must start with +40 and be a valid mobile number"
    }),
    postalCode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.empty": "Postal code is required",
      "string.pattern.base": "Must be a valid 6-character post code"
    }),
    is_billing: Joi.optional(),
    is_shipping: Joi.optional(),
    fromCheckout: Joi.optional()
  })