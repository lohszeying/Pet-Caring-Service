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

async function search(req, res, next) {
	var username = req.query.username;
	var user_tbl;
	var caretaker_tbl;
	var rating_tbl;
	var data;

	try {
		data = await pool.query(sql_query.query.find_user, [username]);
		user_tbl = data.rows;

		data = await pool.query(sql_query.query.find_caretaker, [username]);
		caretaker_tbl = data.rows;

		console.error(caretaker_tbl);

		data = await pool.query(sql_query.query.get_rating, [username]);
		rating_tbl = data.rows;

		if(!req.isAuthenticated()) {
			res.render('search', { page: 'search', auth: false, user_tbl: user_tbl, caretaker_tbl: caretaker_tbl,
				rating_tbl: rating_tbl});
		} else {
			basic(req, res, 'search', { page: 'search', auth: true,
				user_tbl: user_tbl, caretaker_tbl, rating_tbl});
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
