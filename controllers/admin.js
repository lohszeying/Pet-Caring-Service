const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/', function (req, res) {
});

router.get('/login', function (req, res) {
    res.render('admin/login', {error: null});
});

router.post('/login', function (req, res, next) {
    passport.authenticate('admin', (err, admin, info) => {
        const error = err || info;
        if (error) {
            return res.render('admin/login', {error: error});
        }

        if (admin) {
            req.logIn(admin, function (err) {
                if (err) {
                    return res.render('admin/login', {error: err});
                }

                return res.redirect('/admin/dashboard');
            });
        }

        return res.render('admin/login', {error: "Incorrect login details!"});
    })(req, res, next);
});

module.exports = router
