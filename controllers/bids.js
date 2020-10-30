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
        pt_tb1:[]
    };

    pool.query(sql_query.query.all_pet_types, (err, data) => {
        if (err) {
            console.error(err);
        } else {
            if ( data.rows && data.length!=0 )
                    {
                    info.pet_tbl = data.rows;
                    console.log(data.rows);
                    }
            
                    }
        });


        res.render("bids/search-availability", info);
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
        tm_tb1: [],
        pt_tb1: []

    };

    

        pool.query(sql_query.query.get_top_available_caretaker, [req.body.start_date, req.body.end_date, req.body.type], (err2, data2) => {
            if (err2) {
                console.error(err2);
            } else {
                info.caretakers = data2.rows;
            }
            pool.query(sql_query.query.all_transfer_methods, (err3, data3) => {
                if (err3) {
                    console.error(err3);
                } else {
                    if ( data3.rows && data3.length!=0 )
                    {
                    info.tm_tb1 = data3.rows;
                    console.log(data3.rows);
                    }

                }

                pool.query(sql_query.query.all_payment_types, (err4, data4) => {
                    if (err4) {
                        console.error(err4);
                    } else {
                        if ( data4.rows && data4.length!=0 )
                        {
                         info.pt_tb1 = data4.rows;
                        }
                    }

           
                    res.render("bids/search-availability", info);
                });

            });    
            
        });
        
    
});

module.exports = router
