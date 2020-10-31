
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

router.get('/', passport.authMiddleware(), managepet);
router.post('/add_pet', passport.authMiddleware(), add_pet);
router.post('/update_pet', passport.authMiddleware(), update_pet);
router.post('/change_pet_status', passport.authMiddleware(), change_pet_status);
router.post('/edit_req', passport.authMiddleware(), edit_req);
// PET OWNER'S MANAGE PET
async function managepet(req, res, next) {
	var pet_ctx = 0;
	var pettype_tbl;
	var pet_tbl;
	var allspecreq_tbl;
	var listspecreq_tbl;
    var owner_username = req.user.username;
    var data;

    try{
	    data = await pool.query(sql_query.query.all_pet_types);
	    pet_ctx = data.rows.length;
	    pettype_tbl = data.rows;
		

	    data = await pool.query(sql_query.query.list_of_pets, [owner_username]);
		pet_tbl = data.rows;
			

		data = await pool.query(sql_query.query.all_specreq); 
		allspecreq_tbl = data.rows;

		data = await pool.query(sql_query.query.list_of_specreq, [owner_username]);
		listspecreq_tbl = data.rows;

        addpet_msg = msg2(req, 'add_pet', {
						'pass': `You have successfully added a new  ${req.query['pet_type']} named  ${req.query['pet_name']}`,
                        'duplicate': 'You already have a pet with the same name!',
                        'fail': 'Error in adding pet'
					});
		
		basic(req, res, 'managepet', {
				pettype_tbl: pettype_tbl, pet_tbl: pet_tbl,
				specreq_tbl: allspecreq_tbl, listspecreq_tbl: listspecreq_tbl,
				addpet_msg: addpet_msg,
				updatepet_msg: msg2(req, 'update_pet', {
					'duplicate' :`You already have a pet named ${req.query['new_name']}!`,
					'fail' :'Failure in editing name!',
					'pass': `${req.query['old_name']} is now named as ${req.query['new_name']}!`
				}),
				addreq_msg: msg2(req, 'edit_req', {
					'add_pass':`${req.query['pet_name']} now has special requirement of ${req.query['specreq']}`,
					'add_duplicate': `${req.query['pet_name']} already has special requirement of ${req.query['specreq']}`,
					'add_fk': `${req.query['pet_name']} or ${req.query['specreq']} does not exist`,
					'add_fail': 'Failed to add special requirement',
					'remove_pass' : `Successfully removed special requirement of ${req.query['specreq']} from ${req.query['pet_name']}`,
					'remove_none': `${req.query['pet_name']} does not have special requirement of ${req.query['specreq']}`,
					'remove_fail': 'Failed to remove special requirement'
				}),
				updatestat_msg: msg2(req, 'change_pet_status', {
					'fail': 'Failed to update status',
					'nochange' : `${req.query['pet_name']} is already ${req.query['new_status']}!`,
					'pass': `${req.query['pet_name']} has been ${req.query['new_status']}`
				}),
				auth: true
			});
    } catch (e) {
        console.log(e);
    }
}

function add_pet(req, res, next) {
	var pet_name = req.body.petname;
	var pet_type =req.body.type;
	//var specreq = req.body.specreqtype;
	var owner_username = req.user.username;

	// console.log(pet_name);
	// console.log(pet_type);
	// console.log(owner_username);

	pool.query(sql_query.query.add_pet, [pet_name, pet_type, owner_username], (err, data) => {
		if (err) {
            err = wrapError(err);
            if (err instanceof UniqueViolationError) {
                res.redirect('/managepet?add_pet=duplicate')
            } else {
                res.redirect('/managepet?add_pet=fail');
            }

		} else {
			res.redirect('/managepet?add_pet=pass&pet_name=' + pet_name + '&pet_type=' + pet_type);

		}
	});

}

function update_pet(req, res, next) {
	var old_name = req.body.currname;
	var new_name = req.body.newname;
	var owner_username = req.user.username;

	pool.query(sql_query.query.update_pet, [old_name, new_name, owner_username], (err, data) => {
		var update_pet;
		if (err) {
			err = wrapError(err);
			if (err instanceof UniqueViolationError) {
				update_pet = 'duplicate';
			} else {
				update_pet = 'fail';
			}
			console.error("Error in updating pet");
		} else {
			update_pet = 'pass';
		}
		res.redirect(`/managepet?update_pet=${update_pet}&old_name=${old_name}&new_name=${new_name}`);
	});

}

function edit_req(req, res, next) {

	var pet_name = req.body.name;
	var specreq = req.body.specreqtype;
	var owner_username = req.user.username;
	if (req.body.addorremove == "add") {

		pool.query(sql_query.query.add_specreq, [owner_username, pet_name, specreq], (err, data) => {
			var edit_req;
			if (err) {
				err = wrapError(err);
				if (err instanceof UniqueViolationError){
					edit_req = 'add_duplicate';
				} else if (err instanceof ForeignKeyViolationError) {
					edit_req = 'add_fk';
				} else {
					edit_req = 'add_fail';
				}
			} else {
				edit_req = 'add_pass';
			}
			res.redirect(`/managepet?edit_req=${edit_req}&pet_name=${pet_name}&specreq=${specreq}`);
		});
		
	} else {
		pool.query(sql_query.query.delete_specreq, [owner_username, pet_name, specreq], (err, data) => {
			var edit_req;
			console.log(data);
			if (err) {
				edit_req = 'remove_fail';
			} else {
				if (data.rowCount == 0)	{
					edit_req = 'remove_none';
				} else {
					edit_req = 'remove_pass';
				}
			}
			res.redirect(`/managepet?edit_req=${edit_req}&pet_name=${pet_name}&specreq=${specreq}`);
		});
	}

}

function change_pet_status(req, res, next) {
	var pet_name = req.body.name;
	var status = req.body.status;
	var owner_username = req.user.username;
	var isEnabled = true;
	var newStatus;
	if (status === 'enabled') {
		isEnabled = true;
		new_status = 'enabled';
	} else {
		isEnabled = false;
		new_status = 'disabled';
	}

	pool.query(sql_query.query.update_pet_status, [owner_username, pet_name, isEnabled], (err, data) => {
		var pet_status;
		if (err) {
			pet_status = 'fail';
		} else {
			if (data.rowCount == 0) {
				pet_status = 'nochange';
			} else {
				pet_status = 'pass';
			}
		}
		res.redirect(`/managepet?change_pet_status=${pet_status}&pet_name=${pet_name}&new_status=${new_status}`);
	});
}

module.exports = router;