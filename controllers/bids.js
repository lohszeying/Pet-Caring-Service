require('dotenv').load();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const sql_query = require('../sql');
const passport = require('passport');

router.get('/search-availability', passport.authMiddleware(), function (req, res,next) {
   
    const info = {
        page: 'bids/search-availability',
        user: req.user.username,
        name: req.user.name,
        area: req.user.area,
        enabled: req.user.enabled,
        auth: true,
        caretakers: [],
        pet_tbl:[],
        
    };

    pool.query(sql_query.query.all_pet_types, (err, data) => {
        if (err) {
           console.error(err);
        } else {
            info.pet_tbl = data.rows;
        }
        
        res.render("bids/search-availability", info);
    });
    
  
});

module.exports = router
