const sql_query = require('../sql');
const passport = require('passport');
const bcrypt = require('bcrypt');
const adminController = require('../controllers/admin');
const bidsController = require('../controllers/bids');

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
	//app.get('/search', search);

	/* PROTECTED GET */
	app.get('/dashboard', passport.authMiddleware(), require('./dashboard').dashboard);
	/*app.get('/games'    , passport.authMiddleware(), games    );
	app.get('/plays'    , passport.authMiddleware(), plays    );*/
	app.get('/managepet', passport.authMiddleware(), managepet);
	app.get('/caretaker', passport.authMiddleware(), caretaker);
	app.get('/current_bids',passport.authMiddleware(), current_bids);
	app.get('/past_bids', passport.authMiddleware(), past_bids);
	app.get('/rating_review',passport.authMiddleware(), rating_review);

	app.get('/register' , passport.antiMiddleware(), register );
	app.get('/password' , passport.antiMiddleware(), retrieve );

	/* PROTECTED POST */
	app.post('/update_info', passport.authMiddleware(), require('./dashboard').update_info);
	app.post('/update_pass', passport.authMiddleware(), require('./dashboard').update_pass);
	app.post('/update_credcard', passport.authMiddleware(), require('./dashboard').update_credcard);
	//app.post('/add_game'   , passport.authMiddleware(), add_game   );
	//app.post('/add_play'   , passport.authMiddleware(), add_play   );
	app.post('/add_pet', passport.authMiddleware(), add_pet);
	app.post('/update_pet', passport.authMiddleware(), update_pet);
	app.post('/change_pet_status', passport.authMiddleware(), change_pet_status);
	app.post('/add_req', passport.authMiddleware(), add_req);
	app.post('/add_availability', passport.authMiddleware(), require('./caretaker').add_availability);
	app.post('/apply_for_leave', passport.authMiddleware(), require('./caretaker').apply_for_leave);
	app.post('/add_caretaker_type_of_pet', passport.authMiddleware(), require('./caretaker').add_caretaker_type_of_pet);
	app.post('/add_caretaker', passport.authMiddleware(), require('./dashboard').update_caretaker_status);
	app.post('/edit_caretaker_price_of_pet', passport.authMiddleware(), require('./caretaker').edit_caretaker_price_of_pet);
	app.post('/caretaker_accept_bid', passport.authMiddleware(), require('./caretaker').caretaker_accept_bid);
	app.post('/caretaker_reject_bid', passport.authMiddleware(), require('./caretaker').caretaker_reject_bid);
	app.post('/caretaker_complete_bid', passport.authMiddleware(), require('./caretaker').caretaker_complete_bid);
	app.post('/make_bid', passport.authMiddleware(), make_bid);
	app.post('/reg_user'   , passport.antiMiddleware(), reg_user   );

	/* LOGIN */
	app.post('/login', passport.authenticate('local', {
		successRedirect: '/dashboard',
		failureRedirect: '/'
	}));

	app.use('/bids', bidsController);

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
/*
function search(req, res, next) {
	var ctx  = 0, avg = 0, tbl;
	var game = "%" + req.query.gamename.toLowerCase() + "%";
	pool.query(sql_query.query.search_game, [game], (err, data) => {
		if(err || !data.rows || data.rows.length == 0) {
			ctx = 0;
			tbl = [];
		} else {
			ctx = data.rows.length;
			tbl = data.rows;
		}
		if(!req.isAuthenticated()) {
			res.render('search', { page: 'search', auth: false, tbl: tbl, ctx: ctx });
		} else {
			basic(req, res, 'search', { page: 'search', auth: true, tbl: tbl, ctx: ctx });
		}
	});
}
*/


//BID FUNCTION 
function current_bids(req, res, next){
	basic(req, res, 'current_bids',
		{
			page: current_bids,
			auth: true
		});
	
}

function past_bids(req, res, next) {
	basic(req, res, 'past_bids',
		{
			page: past_bids,
			auth: true
		});

}


function make_bid(req, res, next){

	var owner_username = req.user.username;
	var type = req.body.type;
	var caretaker = req.body.caretaker;
	var start_date = req.body.start_date;
	var end_date = req.body.end_date;
	var tm = req.body.tm;
	var pt = req.body.pt;

	pool.query(sql_query.query.make_bid, [owner_username,type,caretaker,start_date,end_date,tm,pt], (err, data) => {
		if (err) {
			console.error("Error in making bid");
			res.redirect('/bid?make_bid=fail');
		} else {
			res.redirect('/managepet?add_req=pass');
		}
	});

}







function rating_review(req, res, next){
	basic(req, res, 'rating_review', { page: 'rating_review', auth: true });
}

// PET OWNER'S MANAGE PET
function managepet(req, res, next) {
	var pet_ctx = 0;
	var pettype_tbl;
	var pet_tbl;
	var allspecreq_tbl;
	var listspecreq_tbl;
	var owner_username = req.user.username;

	pool.query(sql_query.query.all_pet_types, (err, data) => {
		if (err || !data.rows || data.rows.length == 0) {
			pet_ctx = 0;
			pettype_tbl = [];
		} else {
			pet_ctx = data.rows.length;
			pettype_tbl = data.rows;
		}

		pool.query(sql_query.query.list_of_pets, [owner_username], (err, data) => {
			if (err) {
				pet_tbl = [];
			} else {
				pet_tbl = data.rows;
			}

			pool.query(sql_query.query.all_specreq, (err, data) => {
				if (err) {
					allspecreq_tbl = [];
				} else {
					allspecreq_tbl = data.rows;
				}

				pool.query(sql_query.query.list_of_specreq, [owner_username], (err, data) => {
					if (err) {
						listspecreq_tbl = [];
					} else {
						listspecreq_tbl = data.rows;
					}

					basic(req, res, 'managepet', {
						pettype_tbl: pettype_tbl, pet_tbl: pet_tbl,
						specreq_tbl: allspecreq_tbl, listspecreq_tbl: listspecreq_tbl,
						addpet_msg: msg(req, 'add_pet', 'Pet added successfully', 'Cannot add this pet'),
						updatepet_msg: msg(req, 'update_pet', 'Pet updated successfully', 'Cannot update pet'),
						addreq_msg: msg(req, 'add_req', 'Requirement added successfully', 'Cannot add this requirement'),
						updatestat_msg: msg(req, 'change_pet_status', 'Status changed successfully', 'Cannot change status'),
						auth: true
					});

				});
			});
		});

	});

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
			console.error("Error in adding pet");
			res.redirect('/managepet?add_pet=fail');
		} else {
			// pool.query(sql_query.query.add_specreq, [owner_username, pet_name, specreq], (err, data) => {
			// 	if (err) {
			// 		console.error("Error in adding pet");
			// 		res.redirect('/managepet?add_pet=fail');
			// 	} else {
					res.redirect('/managepet?add_pet=pass');
			// 	}
			// });

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



/*function games(req, res, next) {
	var ctx = 0, avg = 0, tbl;
	pool.query(sql_query.query.avg_rating, [req.user.username], (err, data) => {
		if(err || !data.rows || data.rows.length == 0) {
			avg = 0;
		} else {
			avg = data.rows[0].avg;
		}
		pool.query(sql_query.query.all_games, [req.user.username], (err, data) => {
			if(err || !data.rows || data.rows.length == 0) {
				ctx = 0;
				tbl = [];
			} else {
				ctx = data.rows.length;
				tbl = data.rows;
			}
			basic(req, res, 'games', { ctx: ctx, avg: avg, tbl: tbl, game_msg: msg(req, 'add', 'Game added successfully', 'Game does not exist'), auth: true });
		});
	});
}*/
/*function plays(req, res, next) {
	var win = 0, avg = 0, ctx = 0, tbl;
	pool.query(sql_query.query.count_wins, [req.user.username], (err, data) => {
		if(err || !data.rows || data.rows.length == 0) {
			win = 0;
		} else {
			win = data.rows[0].count;
		}
		pool.query(sql_query.query.all_plays, [req.user.username], (err, data) => {
			if(err || !data.rows || data.rows.length == 0) {
				ctx = 0;
				avg = 0;
				tbl = [];
			} else {
				ctx = data.rows.length;
				avg = win == 0 ? 0 : win/ctx;
				tbl = data.rows;
			}
			basic(req, res, 'plays', { win: win, ctx: ctx, avg: avg, tbl: tbl, play_msg: msg(req, 'add', 'Play added successfully', 'Invalid parameter in play'), auth: true });
		});
	});
}*/

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



/*function add_game(req, res, next) {
	var username = req.user.username;
	var gamename = req.body.gamename;

	pool.query(sql_query.query.add_game, [username, gamename], (err, data) => {
		if(err) {
			console.error("Error in adding game");
			res.redirect('/games?add=fail');
		} else {
			res.redirect('/games?add=pass');
		}
	});
}*/
/*function add_play(req, res, next) {
	var username = req.user.username;
	var player1  = req.body.player1;
	var player2  = req.body.player2;
	var gamename = req.body.gamename;
	var winner   = req.body.winner;
	if(username != player1 || player1 == player2 || (winner != player1 && winner != player2)) {
		res.redirect('/plays?add=fail');
	}
	pool.query(sql_query.query.add_play, [player1, player2, gamename, winner], (err, data) => {
		if(err) {
			console.error("Error in adding play");
			res.redirect('/plays?add=fail');
		} else {
			res.redirect('/plays?add=pass');
		}
	});
} */

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
