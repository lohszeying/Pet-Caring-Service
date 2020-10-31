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

        addpet_msg = req.query['add_pet'] =='pass'? 'You have successfully added a new '+ req.query['pet_type'] + ' named ' + req.query['pet_name']
                    : msg2(req, 'add_pet', {
                        'duplicate': 'You already have a pet with the same name!',
                        'fail': 'Error in adding pet'
                    });
		basic(req, res, 'managepet', {
				pettype_tbl: pettype_tbl, pet_tbl: pet_tbl,
				specreq_tbl: allspecreq_tbl, listspecreq_tbl: listspecreq_tbl,
				addpet_msg: addpet_msg,
				updatepet_msg: msg(req, 'update_pet', 'Pet updated successfully', 'Cannot update pet'),
				addreq_msg: msg(req, 'add_req', 'Requirement added successfully', 'Cannot add this requirement'),
				updatestat_msg: msg(req, 'change_pet_status', 'Status changed successfully', 'Cannot change status'),
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
		if (err) {
			console.error("Error in updating pet");
			res.redirect('/managepet?update_pet=fail');
		} else {
			res.redirect('/managepet?update_pet=pass');
		}
	});

}

function add_req(req, res, next) {

	var pet_name = req.body.name;
	var specreq = req.body.specreqtype;
	var owner_username = req.user.username;

	pool.query(sql_query.query.add_specreq, [owner_username, pet_name, specreq], (err, data) => {
		if (err) {
			console.error("Error in adding requirement");
			res.redirect('/managepet?add_req=fail');
		} else {
			res.redirect('/managepet?add_req=pass');
		}
	});

}

function change_pet_status(req, res, next) {
	var pet_name = req.body.name;
	var status = req.body.status;
	var owner_username = req.user.username;
	var isEnabled = true;

	if (status === 'enabled') {
		isEnabled = true;
	} else {
		isEnabled = false;
	}

	pool.query(sql_query.query.update_pet_status, [owner_username, pet_name, isEnabled], (err, data) => {
		if (err) {
			console.error("Error in updating pet status");
			res.redirect('/managepet?change_pet_status=fail');
		} else {
			res.redirect('/managepet?change_pet_status=pass');
		}
	});
}

module.exports = {
    managepet: managepet,
    add_pet: add_pet,
    update_pet: update_pet,
    add_req: add_req,
    change_pet_status: change_pet_status
};