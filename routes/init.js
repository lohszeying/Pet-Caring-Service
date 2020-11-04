const sql_query = require('../sql');
const passport = require('passport');
const bcrypt = require('bcrypt');
const adminController = require('../controllers/admin');
const bidsController = require('../controllers/bids');
const caretakerController = require('../controllers/caretaker');
const managepetController = require('../controllers/managepet');
const dashboardController = require('../controllers/dashboard');
const rating_reviewController = require('../controllers/rating_review');
// Postgre SQL Connection
const { Pool } = require('pg');
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
  //ssl: true
});

const round = 10;
const salt  = bcrypt.genSaltSync(round);

function initRouter(app) {
	/* GET */
	app.get('/'      , index );
	app.get('/search', search);
	app.get('/viewpet', viewpet);
	/* PROTECTED GET */


	app.get('/register' , passport.antiMiddleware(), register );
	app.get('/password' , passport.antiMiddleware(), retrieve );
	/* PROTECTED POST */
	
	app.post('/reg_user'   , passport.antiMiddleware(), reg_user   );

	/* LOGIN */
	app.post('/login', passport.authenticate('local', {
		successRedirect: '/dashboard',
		failureRedirect: '/'
	}));
	app.use('/rating_review', rating_reviewController)
	app.use('/dashboard', dashboardController)
	app.use('/managepet', managepetController);
	app.use('/bids', bidsController);
	app.use('/caretaker', caretakerController)
	// TODO: create separate admin passport strategy
	app.use('/admin', adminController);

	/* LOGOUT */
	app.get('/logout', passport.authMiddleware(), logout);
}


// Render Function
function basic(req, res, page, other) {
	var info = {
		page: page,
		user: req.user.username,
		name: req.user.name,
		area: req.user.area,
		enabled   : req.user.enabled,
	};
	if(other) {
		for(var fld in other) {
			info[fld] = other[fld];
		}
	}
	res.render(page, info);
}
function query(req, fld) {
	return req.query[fld] ? req.query[fld] : '';
}
function msg(req, fld, pass, fail) {
	var info = query(req, fld);
	return info ? (info=='pass' ? pass : fail) : '';
}

// GET
function index(req, res, next) {	
	if(!req.isAuthenticated()) {
		res.render('index', { page: '', auth: false});
	} else {
			basic(req, res, 'index', { page: '', auth: true});
	}
}

function viewpet(req, res, next) {
	var username = req.query.username;
	var petname = req.query.petname;
	var pet_tbl;
	var petreq_tbl;
	//var data;

	console.log("user: " + username);
	console.log("pet: " + petname);

	pool.query(sql_query.query.find_pet, [username, petname], (err, data) => {

		if (err || !data.rows || data.rows.length == 0) {
			console.error("Error in finding pet");
		} else {
			pet_tbl = data.rows;
		}
		
		pool.query(sql_query.query.find_pet_req, [username, petname], (err, data) => {

			if (err || !data.rows || data.rows.length == 0) {
				console.error("Error in finding pet req");
			} else {
				petreq_tbl = data.rows;
			}

			if (!req.isAuthenticated()) {
				res.render('viewpet', {
					page: 'viewpet', auth: false, pet_tbl: pet_tbl, petreq_tbl: petreq_tbl, user_name: username
				});
			} else {
				basic(req, res, 'viewpet', {
					page: 'viewpet', auth: true, pet_tbl: pet_tbl, petreq_tbl: petreq_tbl, user_name: username
				});
			}
		});

	});


	// try {
	// 	data = await pool.query(sql_query.query.find_pet, [username, petname]);
	// 	pet_tbl = data.rows;

	// 	console.log("pet table: " + pet_tbl.pet_type);

	// 	data = await pool.query(sql_query.query.find_pet_req, [username, petname]);
	// 	pet_req_tbl = data.rows;

	// 	if (!req.isAuthenticated()) {
	// 		res.render('viewpet', {
	// 			page: 'viewpet', auth: false, pet_tbl: pet_tbl, pet_req_tbl: pet_req_tbl, user_name: username
	// 		});
	// 	} else {
	// 		basic(req, res, 'viewpet', {
	// 			page: 'viewpet', auth: true, pet_tbl: pet_tbl, pet_req_tbl: pet_req_tbl, user_name: username
	// 		});
	// 	}


	// } catch (e) {
	// 	console.log(e);
	// }

}

async function search(req, res, next) {
	var username = req.query.username;
	var user_tbl;
	var caretaker_tbl;
	var rating_tbl; //average rating
	var completed_bids_tbl;
	var total_completed_bids;
	var pets_tbl;
	var data;

	try {
		data = await pool.query(sql_query.query.find_user, [username]);
		user_tbl = data.rows;

		data = await pool.query(sql_query.query.find_caretaker, [username]);
		caretaker_tbl = data.rows;

		console.log("caretaker: " + caretaker_tbl.username);

		data = await pool.query(sql_query.query.get_rating, [username]);
		rating_tbl = data.rows;

		data = await pool.query(sql_query.query.get_all_completed_bids_for_caretaker, [username]);
		completed_bids_tbl = data.rows;
		total_completed_bids = data.rows.length;

		data = await pool.query(sql_query.query.list_of_enabled_pets, [username]);
		pets_tbl = data.rows;

		//console.error(completed_bids_tbl);

		if(!req.isAuthenticated()) {
			res.render('search', { page: 'search', auth: false, user_tbl: user_tbl, caretaker_tbl: caretaker_tbl,
				rating_tbl: rating_tbl, completed_bids_tbl: completed_bids_tbl, total_completed_bids: total_completed_bids,
				pets_tbl: pets_tbl, user_name: username});
		} else {
			basic(req, res, 'search', { page: 'search', auth: true,
				user_tbl: user_tbl, caretaker_tbl, rating_tbl, completed_bids_tbl: completed_bids_tbl,
				total_completed_bids: total_completed_bids, pets_tbl: pets_tbl, username: username});
		}


	} catch (e) {
		console.log(e);
	}

	/*pool.query(sql_query.query.find_user, [username], (err, data) => {
		if(err || !data.rows || data.rows.length == 0) {
			tbl = [];
		} else {
			tbl = data.rows;
		}
		console.error(tbl);

		basic(req, res, 'search', { page: 'search', auth: true, tbl: tbl});
	}); */
}







function register(req, res, next) {
	res.render('register', { page: 'register', auth: false });
}
function retrieve(req, res, next) {
	res.render('retrieve', { page: 'retrieve', auth: false });
}


// POST 

//Maybe PCS Admin can use this
function add_pettypes(req, res, next) {
	var name = req.body.type;

	pool.query(sql_query.query.add_caretaker_pet_types, [name], (err, data) => {
		if (err) {
			console.error("Error in adding caretaker, ERROR: " + err);
			res.redirect('/caretaker?add-pettypes=fail');
		}
	});
}



function reg_user(req, res, next) {
	var username = req.body.username;
	var password = bcrypt.hashSync(req.body.password, salt);
	var name = req.body.name;
	var area = req.body.area;
	pool.query(sql_query.query.add_user, [username, password, name, area], (err, data) => {
		if (err) {
			console.error("Error in adding user", err);
			res.redirect('/register?reg=fail');
		} else {
			req.login({
				username: username,
				passwordHash: password,
				name: name,
				area: area,
				enabled: true

			}, function (err) {
				if (err) {
					return res.redirect('/register?reg=fail');
				} else {
					return res.redirect('/dashboard');
				}
			});
		}
	});
}


// LOGOUT
function logout(req, res, next) {
	req.session.destroy()
	req.logout()
	res.redirect('/')
}

module.exports = initRouter;
