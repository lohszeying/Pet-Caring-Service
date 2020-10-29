function adminAuthMiddleware() {
    return (req, res, next) => {
        if (req.isAuthenticated() && req.user.isAdmin) {
            return next();
        }
        return res.redirect('/admin/login');
    };
}

module.exports = adminAuthMiddleware
