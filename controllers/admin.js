const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/', passport.authMiddleware(), function (req, res) {
    res.render("admin/dashboard", {auth: true});
});

router.get('/login', passport.antiMiddleware(), function (req, res) {
    res.render('admin/login', {error: null, auth: false});
});

router.post('/login', passport.antiMiddleware(), function (req, res, next) {
    passport.authenticate('admin', (err, admin, info) => {
        const error = err || info;
        if (error) {
            return res.render('admin/login', {error: error, auth: false});
        }

        if (admin) {
            req.logIn(admin, function (err) {
                if (err) {
                    return res.render('admin/login', {error: err, auth: false});
                }

                return res.redirect('/admin/');
            });
        }

        return res.render('admin/login', {error: "Incorrect login details!", auth: false});
    })(req, res, next);
});

module.exports = router
