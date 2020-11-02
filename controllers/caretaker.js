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

router.get('/', passport.authMiddleware(), caretaker);
router.post('/add_availability', passport.authMiddleware(), add_availability);
router.post('/apply_for_leave', passport.authMiddleware(), apply_for_leave);
router.post('/add_caretaker_type_of_pet', passport.authMiddleware(), add_caretaker_type_of_pet);
router.post('/edit_caretaker_price_of_pet', passport.authMiddleware(), edit_caretaker_price_of_pet);
router.post('/caretaker_accept_bid', passport.authMiddleware(), caretaker_accept_bid);
router.post('/caretaker_reject_bid', passport.authMiddleware(), caretaker_reject_bid);
router.post('/caretaker_complete_bid', passport.authMiddleware(), caretaker_complete_bid);

function getDateString(da) {
	var m = moment(da, 'ddd MMM DD YYYY hh:mm:ss [GMT]ZZ').format('MM-DD-YYYY');
	return m;
}
function getYearMonth(yr, mth) {
	return moment().month(mth-1).format("MMMM").toString() + '-' + yr.toString() ;
}
//CARETAKER FUNCTION
async function caretaker(req, res, next) {
	var ctx = 0, avg = 0, tbl;
	var ctx2 = 0, tbl2;
	var pet_ctx = 0, pet_tbl;
	var caretaker_tbl;
	var caretaker_pet_tbl;
	var pending_bid_tbl;
	var accepted_bid_tbl;
	var completed_bid_tbl;
	var salary_tbl;
	var all_salary_tbl
	var currYear = new Date().getFullYear();
	var currMonth = new Date().getMonth() + 1;
	var caretaker_rating_tbl;
    

    var data;
    try{
        data = await pool.query(sql_query.query.find_caretaker, [req.user.username]); 
	    if (!data.rows || data.rows.length == 0) {
			//Not a caretaker
		    console.error("NOT A CARETAKER");
		    res.redirect('/dashboard?add-caretaker=fail');
        } else {
	        data = await pool.query(sql_query.query.all_availability, [req.user.username]);
            ctx = data.rows.length;
	        tbl = data.rows;

	        data = await pool.query(sql_query.query.all_caretaker_pettypeprice, [req.user.username]);
	        ctx2 = data.rows.length;
	        tbl2 = data.rows;
            data = await pool.query(sql_query.query.all_pet_types); 
	        pet_ctx = data.rows.length;
	        pet_tbl = data.rows;

	        data = await pool.query(sql_query.query.caretaker_fulltime_parttime, [req.user.username]); 
	        caretaker_tbl = data.rows;


	        data = await pool.query(sql_query.query.all_caretaker_pettypeprice, [req.user.username]); 
	        caretaker_pet_tbl = data.rows;

	        data = await pool.query(sql_query.query.get_pending_bids_for_caretaker, [req.user.username]);
	        pending_bid_tbl = data.rows;

            data = await pool.query(sql_query.query.get_all_accepted_bids_for_caretaker, [req.user.username]);
	        accepted_bid_tbl = data.rows;

	        data = await pool.query(sql_query.query.get_salary_for_the_month, [req.user.username, currYear, currMonth]);
	        salary_tbl = data.rows;

	        data = await pool.query(sql_query.query.get_rating, [req.user.username]);
	        caretaker_rating_tbl = data.rows;


	        data = await pool.query(sql_query.query.get_all_completed_bids_for_caretaker, [req.user.username]); 

	        completed_bid_tbl = data.rows;

			data = await pool.query(sql_query.query.get_salary_record, [req.user.username]);
			all_salary_tbl = data.rows;
			
	        basic(req, res, 'caretaker',
	        { ctx: ctx, tbl: tbl, ctx2: ctx2, tbl2: tbl2, pet_ctx: pet_ctx, pet_tbl: pet_tbl,
	        caretaker_tbl: caretaker_tbl, caretaker_pet_tbl: caretaker_pet_tbl,
	        pending_bid_tbl: pending_bid_tbl, accepted_bid_tbl: accepted_bid_tbl,
	        salary_tbl: salary_tbl, caretaker_rating_tbl: caretaker_rating_tbl,
	        completed_bid_tbl: completed_bid_tbl,
	        accept_bid_msg: msg(req, 'accept-bid', 'Bid accepted successfully', 'Error in accepting bid'),
			reject_bid_msg: msg(req, 'reject-bid', 'Bid rejected successfully', 'Error in rejecting bid'),
            complete_bid_msg: msg(req, 'complete-bid', 'Bid completed successfully', 'Error in completing bid'),
	        date_msg: msg2(req, 'add-availability', {
				'pass': 'You are now available on ' + req.query['date'],
				'duplicate': 'You are already available on ' + req.query['date'],
				'fail': 'Error. Cannot add this date to availability'
			}),
	        caretaker_pet_type_msg: msg2(req, 'add-pet_type', {
				'pass' : 'You can now care for ' + req.query['pet_type'],
				'duplicate' : 'You can already care for ' + req.query['pet_type'],
				'non_exist': 'This pet does not exist',
				'fail': 'Unknown error. Failed to add pet'
			}),
	        caretaker_pet_price_msg: msg2(req, 'edit-pet_price', {
				'pass': req.query['type']+' price changed to $'+req.query['price']+' successfully!',
				'fulltimer' : 'Fulltimers cannot change prices!',
				'fail' : 'Failed in editing pet price'
			}),			
			caretaker_apply_leave_msg: msg2(req, 'apply-leave', {
				'pass' : 'Successfully applied for leave on ' + req.query['date'],
				'have_bid': 'You already have a bid on ' + req.query['date'],
				'no_availability': 'You are already not available on '+req.query['date']
			}),
			auth: true,
			all_salary_tbl: all_salary_tbl,
			getDateString: getDateString,
			getYearMonth: getYearMonth });
        }
    } catch (e) {
        console.log(e);
    }
}

function add_availability(req, res, next) {
	var username = req.user.username;
	var date = req.body.date;
    pool.query(sql_query.query.add_availability, [username, date], (err, data) => {
		if (err) {
            err = wrapError(err);
            if (err instanceof UniqueViolationError) {
				console.error("You are already available on this date!")
				res.redirect('/caretaker?add-availability=duplicate&date='+date);
            } else {
				console.error("Error in adding availability, ERROR: " + err);
				res.redirect('/caretaker?add-availability=fail');
            }
		} else {
			res.redirect('/caretaker?add-availability=pass&date='+date);
		}
	});
}

async function apply_for_leave(req, res, next) {
	var username = req.user.username;
	var date = req.body.date;
	pool.query(sql_query.query.delete_availability, [username, date], (err, result) => {
		console.log(result);
		if (err) {
			console.log(wrapError(err).nativeError);
			res.redirect('/caretaker?apply-leave=have_bid&date='+date);
		} else if (result.rowCount ==0 ){
			console.log('You do not have an availability here!')
			res.redirect('/caretaker?apply-leave=no_availability&date='+date);
		} else{

			res.redirect('/caretaker?apply-leave=pass&date='+date);
		}
	});
}

//Only add pet-type for caretaker
async function add_caretaker_type_of_pet(req, res, next) {
	var username = req.user.username;
	var type = req.body.type;
    try {
        await pool.query(sql_query.query.add_caretaker_type_of_pet, [username, type]);
        res.redirect('/caretaker?add-pet_type=pass&pet_type=' + type);
    }  catch (err) {
        err = wrapError(err);
        if (err instanceof UniqueViolationError) {
			console.error("You can take care of this pet!");
			res.redirect('/caretaker?add-pet_type=duplicate&pet_type=' + type);
        } else if (err instanceof ForeignKeyViolationError) {
			console.error("No such pet");
			res.redirect('/caretaker?add-pet_type=non_exist');
        } else {
			console.error(err);
			res.redirect('/caretaker?add-pet_type=fail');
        }
    }
}

//Only edit price for caretaker, pet must exist first in caretaker's table already
async function edit_caretaker_price_of_pet(req, res, next) {
	var username = req.user.username;
	var type = req.body.type;
	var price = req.body.price;
    var data;
    try {
        data = await pool.query(sql_query.query.caretaker_fulltime_parttime, [username]);
        if (data.rows[0].is_fulltime) {
            console.error("Full-timer, cannot update price");
			res.redirect('/caretaker?edit-pet_price=fulltimer');
        } else {
            pool.query(sql_query.query.update_caretaker_pettype_price, [username, type, price]);
            res.redirect('/caretaker?edit-pet_price=pass&price='+price+'&type='+type);
        }
    } catch (err) {
        console.error("Error in updating pet type + price, ERROR: " + err);
		res.redirect('/caretaker?edit-pet_price=fail');
    }

}

function caretaker_accept_bid(req, res, next) {
	var username = req.user.username;
	var owner_username = req.body.owner_username;
	var pet_name = req.body.pet_name;
	var start_date = req.body.start_date;
	var end_date = req.body.end_date;

	pool.query(sql_query.query.update_caretaker_accepted_bid, [username, owner_username, pet_name, start_date, end_date], (err, data) => {
		console.log(data);
		console.log(err);
		if (err) {
			console.error("Error in accepting bid, ERROR: " + err);
			res.redirect('/caretaker?accept-bid=fail');
		} else {
			res.redirect('/caretaker?accept-bid=pass');
		}
	});
}
function caretaker_reject_bid(req, res, next) {
	var username = req.user.username;
	var owner_username = req.body.owner_username;
	var pet_name = req.body.pet_name;
	var start_date = req.body.start_date;
	var end_date = req.body.end_date;

	pool.query(sql_query.query.update_caretaker_rejected_bid, [username, owner_username, pet_name, start_date, end_date], (err, data) => {
		if (err) {
			console.error("Error in rejecting bid, ERROR: " + err);
			res.redirect('/caretaker?reject-bid=fail');
		} else {
			res.redirect('/caretaker?reject-bid=pass');
		}
	});
}

function caretaker_complete_bid(req, res, next) {
	var username = req.user.username;
	var owner_username = req.body.owner_username;
	var pet_name = req.body.pet_name;
	var start_date = req.body.start_date;
	var end_date = req.body.end_date;
    console.log(req.body.end_date);
	pool.query(sql_query.query.complete_bid, [username, owner_username, pet_name, start_date, end_date], (err, data) => {
		if (err) {
			console.error("Error in completing bid, ERROR: " + err);
			res.redirect('/caretaker?complete-bid=fail');
		} else {
			res.redirect('/caretaker?complete-bid=pass');
		}
	});
}


module.exports = router;