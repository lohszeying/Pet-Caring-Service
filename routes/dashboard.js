const sql_query = require('../sql');
const passport = require('passport');
const { Pool } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
  //ssl: true
});
const bcrypt = require('bcrypt');
const round = 10;
const salt  = bcrypt.genSaltSync(round);

const basic = require('./basic').basic;
const query = require('./basic').query;
const msg = require('./basic').msg;

function dashboard(req, res, next) {
	basic(req, res, 'dashboard', {
		cannot_go_to_caretaker_page_msg: msg(req, 'add-caretaker', '', 'You are not a caretaker. You can only view caretaker page if you are a caretaker. You can enable it below.'),
		caretaker_add_msg: msg(req, 'caretaker', 'You are now a caretaker', 'Error in updating caretaker status. You are already a caretaker.'),
		info_msg: msg(req, 'info', 'Information updated successfully', 'Error in updating information'),
		credcard_msg: msg(req, 'credcard', 'Credit card updated successfully', 'Error in updating credit card'),
		pass_msg: msg(req, 'pass', 'Password updated successfully', 'Error in updating password'), auth: true });
}

function update_info(req, res, next) {
	var username  = req.user.username;
	var name = req.body.name;
	var area = req.body.area;
	pool.query(sql_query.query.update_information, [username,name,area], (err, data) => {
		if(err) {
			console.error("Error in update info");
			res.redirect('/dashboard?info=fail');
		} else {
			res.redirect('/dashboard?info=pass');
		}
	});
}

function update_credcard(req, res, next) {
	var username = req.user.username;
	var creditcard = req.body.creditcard;

	pool.query(sql_query.query.update_credcard, [username, creditcard], (err, data) => {
		if (err) {
			console.error("Error in update credit card");
			res.redirect('/dashboard?credcard=fail');
		} else {
			res.redirect('/dashboard?credcard=pass');
		}
	});
}

function update_caretaker_status(req, res, next) {
	var username = req.user.username;
	var yes = req.body.username;

	pool.query(sql_query.query.add_caretaker, [yes], (err, data) => {
		if(err) {
			console.error("Error in updating caretaker status");
			res.redirect('/dashboard?caretaker=fail');
		} else {
			res.redirect('/dashboard?caretaker=pass');
		}
	});
}
function update_pass(req, res, next) {
	var username = req.user.username;
	var password = bcrypt.hashSync(req.body.password, salt);
	pool.query(sql_query.query.update_pass, [username, password], (err, data) => {
		if(err) {
			console.error("Error in update pass");
			res.redirect('/dashboard?pass=fail');
		} else {
			res.redirect('/dashboard?pass=pass');
		}
	});
}

module.exports = {dashboard: dashboard,
                update_info: update_info,
                update_credcard: update_credcard,
                update_caretaker_status: update_caretaker_status,
                update_pass: update_pass,
};