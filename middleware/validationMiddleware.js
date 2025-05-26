import { loginSchema, registerSchema } from "../schemas/authSchemas.js";
import { addressSchema } from "../schemas/addressSchema.js";
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas/passwordSchema.js";

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

export const validateAdminRegister = (req, res, next) => {
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
    return res.redirect("/admin/create");
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

export const validateChangePassword = (req, res, next) => {
  // Trim inputs
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  const { error } = changePasswordSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    req.flash("error", errors.join(", "));
    
    // Redirect back to password change page
    return res.redirect(req.originalUrl);
  }
  
  next();
}

export const validateEmail = (req, res, next) => {
  // Trim inputs
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  const { error } = forgotPasswordSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    req.flash("error", errors.join(", "));
    
    return res.redirect(req.originalUrl);
  }
  
  next();
}

export const validateResetPassword = (req, res, next) => {
  // Trim inputs
  const validationContent = {
    password: req.body.password.trim(),
    cpassword: req.body.cpassword.trim()
  };

  const { error } = resetPasswordSchema.validate(validationContent, {
    abortEarly: false,
    allowUnknown: true // Allow token field to exist without being validated
   });

  if (error) {
    console.error("Validation errors:", error.details);
    const errors = error.details.map(detail => detail.message);
    req.flash("error", errors.join(", "));
    return res.redirect(`/auth/reset-password?token=${req.body.token}`);
  }
  
  next();
}