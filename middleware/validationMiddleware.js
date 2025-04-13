import { loginSchema, registerSchema } from "../schemas/authSchemas.js";

export const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    req.flash('error', errors.join(', '));
    return res.redirect('/auth/login');
  }
  next();
};

export const validateRegister = (req, res, next) => {
  const { error } = registerSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    req.flash('error', errors.join(', '));
    return res.redirect('/auth/register');
  }
  next();
};