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
        tm_tb1:[],
        pt_tb1:[],
        additionalInfo: {
            start_date: '',
            end_date: '',
            pet_type: ''
        }
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
        tm_tb1:[],
        pt_tb1:[],
        additionalInfo: {
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            pet_type: req.body.type
        }
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
            pool.query(sql_query.query.all_transfer_methods, (err3, data3) => {
                if (err3) {
                    console.error(err3);
                } else {
                    info.tm_tb1 = data3.rows;
                    console.log(data3.rows);
                    }
                pool.query(sql_query.query.all_payment_types, (err4, data4) => {
                    if (err4) {
                        console.error(err4);
                    } else {
                         info.pt_tb1 = data4.rows;
                        }       
                    res.render("bids/search-availability", info);
                });
            });
            
        });
    });
});

router.get('/submit-bid', passport.authMiddleware(), function (req, res, next) {
    return res.redirect('/bids/search-availability');
});

router.post('/submit-bid', passport.authMiddleware(), function (req, res, next) {
    
    pool.query(sql_query.query.make_bid, [req.user.username, req.body.pet_type, req.body.caretaker_username, req.body.start_date, req.body.end_date, req.body.tm, req.body.pt], (err5, data5) => {
        if (err5) {
            console.error(err5);
        } else {
            console.log("success");
            return res.redirect('/bids/search-availability');

        }  
    });


});

module.exports = router
