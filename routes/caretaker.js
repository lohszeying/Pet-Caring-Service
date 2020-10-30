const sql_query = require('../sql');
const passport = require('passport');
const { Pool } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
  //ssl: true
});
const {
    wrapError,
    DBError,
    UniqueViolationError,
    NotNullViolationError, 
    ForeignKeyViolationError
  } = require('db-errors');

const basic = require('./basic').basic;
const query = require('./basic').query;
const msg = require('./basic').msg;

function getDateString(da) {
    return da.getUTCFullYear()+'/'+(da.getUTCMonth()+1)+'/'+(da.getUTCDate()+1);
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

    
	        basic(req, res, 'caretaker',
	        { ctx: ctx, tbl: tbl, ctx2: ctx2, tbl2: tbl2, pet_ctx: pet_ctx, pet_tbl: pet_tbl,
	        caretaker_tbl: caretaker_tbl, caretaker_pet_tbl: caretaker_pet_tbl,
	        pending_bid_tbl: pending_bid_tbl, accepted_bid_tbl: accepted_bid_tbl,
	        salary_tbl: salary_tbl, caretaker_rating_tbl: caretaker_rating_tbl,
	        completed_bid_tbl: completed_bid_tbl,
	        accept_bid_msg: msg(req, 'accept-bid', 'Bid accepted successfully', 'Error in accepting bid'),
            complete_bid_msg: msg(req, 'complete-bid', 'Bid completed successfully', 'Error in completing bid'),
	        date_msg: msg(req, 'add-availability', 'Date added successfully', 'Cannot add this date to availability'),
	        caretaker_pet_type_msg: msg(req, 'add-pet_type', 'Type of pet added successfully', 'Failed in adding type of pet, pet is already in the table'),
	        caretaker_pet_price_msg: msg(req, 'edit-pet_price', 'Pet price edited successfully', 'Failed in editing pet price'),
	        caretaker_apply_leave_msg: msg(req, 'apply-leave', 'Successfully applied for leave', 'Failed in applying leave'),
            auth: true,
            getDateString: getDateString });
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
            } else {
                console.error("Error in adding availability, ERROR: " + err);
            }
			res.redirect('/caretaker?add-availability=fail');
		} else {
			res.redirect('/caretaker?add-availability=pass');
		}
	});
}

function apply_for_leave(req, res, next) {
	var username = req.user.username;
	var date = req.body.date;
	pool.query(sql_query.query.delete_availability, [username, date], (err, data) => {
		if (err) {
			console.error("Error in applying for leave, ERROR: " + err);
			res.redirect('/caretaker?apply-leave=fail');
		} else {
			res.redirect('/caretaker?apply-leave=pass');
		}
	});
}

//Only add pet-type for caretaker
async function add_caretaker_type_of_pet(req, res, next) {
	var username = req.user.username;
	var type = req.body.type;
    try {
        await pool.query(sql_query.query.add_caretaker_type_of_pet, [username, type]);
        res.redirect('/caretaker?add-pet_type=pass');
    }  catch (err) {
        err = wrapError(err);
        if (err instanceof UniqueViolationError) {
            console.error("You can take care of this pet!");
        } else if (err instanceof ForeignKeyViolationError) {
            console.error("No such pet");
        } else {
            console.error(err);
        }
        res.redirect('/caretaker?add-pet_type=fail');
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
			res.redirect('/caretaker?edit-pet_price=fail');
        } else {
            pool.query(sql_query.query.update_caretaker_pettype_price, [username, type, price]);
            res.redirect('/caretaker?edit-pet_price=pass');
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


module.exports = {caretaker : caretaker,
add_availability: add_availability,
apply_for_leave: apply_for_leave,
add_caretaker_type_of_pet: add_caretaker_type_of_pet,
edit_caretaker_price_of_pet: edit_caretaker_price_of_pet,
caretaker_accept_bid: caretaker_accept_bid,
caretaker_complete_bid: caretaker_complete_bid,
caretaker_reject_bid: caretaker_reject_bid};