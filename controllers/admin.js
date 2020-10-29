require('dotenv').load();
const express = require('express');
const router = express.Router();
const {Pool} = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const sql_query = require('../sql');
const passport = require('passport');
const admin_auth = require('../auth/admin-auth');

router.get('/', admin_auth(), function (req, res) {
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

router.get('/caretaker-stats', admin_auth(), (req, res) => {
    const info = {
        user: req.user.username,
        auth: true,
        queryResult: null
    };

    res.render('admin/caretaker-stats', info);
});

router.post('/caretaker-stats', admin_auth(), (req, res) => {
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

router.get('/pet-stats', admin_auth(), (req, res) => {
    const info = {
        user: req.user.username,
        auth: true,
        queryResult: null
    };

    res.render('admin/pet-stats', info);
});

router.post('/pet-stats', admin_auth(), (req, res) => {
    const info = {
        user: req.user.username,
        auth: true,
        queryResult: null
    };

    pool.query(sql_query.admin.month_pets_taken_care, [req.body['stat-date']], (err, data) => {
        if (err) {
            console.error(err);
        } else {
            info.queryResult = data.rows[0].month_pet_count;
        }

        res.render('admin/pet-stats', info);
    });
});

router.get('/pricing', admin_auth(), (req, res) => {
    const info = {
        user: req.user.username,
        auth: true,
        petTypePricing: null
    };

    pool.query(sql_query.admin.get_pet_type_pricing, (err, data) => {
        if (err) {
            console.error(err);
        } else {
            info.petTypePricing = data.rows;
        }

        res.render('admin/pricing', info);
    });

});

router.post('/pricing', admin_auth(), (req, res) => {
    const info = {
        user: req.user.username,
        auth: true,
        petTypePricing: null
    };

    pool.query(sql_query.admin.update_pet_type_pricing, [req.body.pet_type, req.body.base_price], (err, data) => {
        if (err) {
            console.error(err);
        }

        pool.query(sql_query.admin.get_pet_type_pricing, (err2, data2) => {
            if (err2) {
                console.error(err2);
            } else {
                info.petTypePricing = data2.rows;
            }

            res.render('admin/pricing', info);
        });
    });
});


router.post('/pricing', admin_auth(), (req, res) => {

});

module.exports = router
