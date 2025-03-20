
// If user is authenticated, proceed to the next handler/middleware
export const authenticate = (req, res, next) => { 
    console.log("Session ID:", req.sessionID); // Log the session ID
    console.log("User:", req.user); // Log the user object
    console.log("Is Authenticated:", req.isAuthenticated());
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: "Not logged in."}) 
}

export const isAdmin = (req, res, next) => {
    if (req.user.role === "admin") {
      return next(); // If user is an admin, proceed to next handler/middlware
    }
    res.status(403).json({ error: "Unauthorized: Admin Only"});
  }

  