import { loginSchema, registerSchema } from "../schemas/authSchema.js";
import { addressSchema } from "../schemas/addressSchema.js";

export const validateLogin = (req, res, next) => {
  // Trim each input in case user added blankspace by mistake
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    req.flash("error", errors.join(", "));
    return res.redirect("/auth/login");
  }
  next();
};

export const validateRegister = (req, res, next) => {
  // Trim each input in case user added blankspace by mistake
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  const { error } = registerSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    req.flash("error", errors.join(", "));
    return res.redirect("/auth/register");
  }
  next();
};

export const validateAddress = (req, res, next) => {
  // Trim each input in case user added blankspace by mistake
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  const { error } = addressSchema.validate(req.body, { abortEarly: false});

  if (error) {
    const errors = error.details.map(detail => detail.message);
    req.flash("error", errors.join(", "));

    const redirectUrl = req.body.fromCheckout 
      ? "/cart/checkout" 
      : "/user/account";
      
    return res.redirect(redirectUrl);
  }
  next();
}