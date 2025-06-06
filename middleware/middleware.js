// If user is authenticated, proceed to the next handler/middleware
export const authenticate = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "Not logged in");
  res.redirect("/");
};

export const isAdmin = (req, res, next) => {
  if (req.user.role === "admin") {
    return next(); // If user is an admin, proceed to next handler/middlware
  }
  req.flash("error", "Unauthorized: Admin only");
  res.redirect("/");
};

export const redirectIfAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect("/user/account");
  }
  next();
};

export const isDemo = (req, res, next) => {
  if (req.user.email === "admin@demo.com") {
    req.flash("error", "This action is disabled in demo mode");
    return res.redirect("/admin/dashboard");
  }
  next();
};
