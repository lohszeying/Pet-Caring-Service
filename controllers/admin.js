require('dotenv').load();
const express = require('express');
const router = express.Router();
const {Pool} = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const sql_query = require('../sql');
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

router.get('/caretaker-stats', passport.authMiddleware(), (req, res) => {
    const info = {
        user: req.user.username,
        auth: true,
        queryResult: null
    };

    res.render('admin/caretaker-stats', info);
});

router.post('/caretaker-stats', passport.authMiddleware(), (req, res) => {
    const info = {
        user: req.user.username,
        auth: true,
        queryResult: null
    };

    pool.query(sql_query.admin.month_caretaker_salary, [req.body['stat-date']], (err, data) => {
        if (err) {
            console.error(err);
        } else {
            info.queryResult = data.rows[0].month_total_salary;
        }

        res.render('admin/caretaker-stats', info);
    });
});

module.exports = router
