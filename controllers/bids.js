require('dotenv').load();
const express = require('express');
const router = express.Router();
const {Pool} = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const sql_query = require('../sql');
const passport = require('passport');

router.get('/search-availability', passport.authMiddleware(), function (req, res, next) {
   
    const info = {
        page: 'bids/search-availability',
        user: req.user.username,
        name: req.user.name,
        area: req.user.area,
        enabled: req.user.enabled,
        auth: true,
        caretakers: [],
        pet_tbl: [],
    };

    pool.query(sql_query.query.list_of_pets, [req.user.username],(err, data) => {
        if (err) {
            console.error(err);
        } else {
            info.pet_tbl = data.rows;
        }
        res.render("bids/search-availability", info);
    });
});

router.post('/search-availability', passport.authMiddleware(), function (req, res, next) {

    const info = {
        page: 'bids/search-availability',
        user: req.user.username,
        name: req.user.name,
        area: req.user.area,
        enabled: req.user.enabled,
        auth: true,
        caretakers: [],
        pet_tbl: [],

    };

    pool.query(sql_query.query.list_of_pets,[req.user.username], (err, data) => {
        if (err) {
            console.error(err);
        } else {
            info.pet_tbl = data.rows;
        }

        //inputs: 1. startdate, 2. enddate, 3.petowner, 4. petname
        pool.query(sql_query.query.get_top_available_caretaker, [req.body.start_date, req.body.end_date, req.user.username, req.body.type], (err2, data2) => {
            if (err2) {
                console.error(err2);
            } else {
                info.caretakers = data2.rows;
            } 

            res.render("bids/search-availability", info);
        });
    });
});

module.exports = router
