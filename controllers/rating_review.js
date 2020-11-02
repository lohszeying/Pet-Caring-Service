require('dotenv').load();
const express = require('express');
const router = express.Router();
const sql_query = require('../sql');
const passport = require('passport');
const { Pool } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
  //ssl: true
});
const moment = require('moment');
const {
    wrapError,
    DBError,
    UniqueViolationError,
    NotNullViolationError, 
    ForeignKeyViolationError
  } = require('db-errors');
const { msg2 } = require('./basic');

const basic = require('./basic').basic;
const query = require('./basic').query;
const msg = require('./basic').msg;

router.get('/', rating_review);
router.post('/submit_review', submit_review)

function getDateString(da) {
	var m = moment(da, 'ddd MMM DD YYYY hh:mm:ss [GMT]ZZ').format('MM-DD-YYYY');
	return m;
}
async function rating_review(req, res, next){
    var info = {
        bid_tbl: [],
        getDateString: getDateString
    }
    var data;
    try {
        data = await pool.query(sql_query.query.get_all_completed_unrated_bids, [req.user.username]); 
        info.bid_tbl = data.rows;
        basic(req, res, 'rating_review', { page: 'rating_review', info: info, auth: true });
    } catch(e) {
    }
}

async function submit_review(req, res, next) {
    try{
    var result = await pool.query(sql_query.query.submit_review, 
        [req.body.rating, req.body.review, req.user.username, req.body.pet_name, req.body.caretaker_username, req.body.start_date, req.body.end_date]);
        console.log(result);
    res.redirect('/rating_review');
    } catch(e) {
        console.log(e);
    }
}
module.exports = router;