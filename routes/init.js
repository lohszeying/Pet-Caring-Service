const sql_query = require('../sql');
const passport = require('passport');
const bcrypt = require('bcrypt')

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
	app.get('/dashboard', passport.authMiddleware(), dashboard);
	/*app.get('/games'    , passport.authMiddleware(), games    );
	app.get('/plays'    , passport.authMiddleware(), plays    );*/
	app.get('/managepet', passport.authMiddleware(), managepet);
	app.get('/caretaker', passport.authMiddleware(), caretaker);
	
	app.get('/register' , passport.antiMiddleware(), register );
	app.get('/password' , passport.antiMiddleware(), retrieve );
	
	/* PROTECTED POST */
	app.post('/update_info', passport.authMiddleware(), update_info);
	app.post('/update_pass', passport.authMiddleware(), update_pass);
	app.post('/update_credcard', passport.authMiddleware(), update_credcard);
	//app.post('/add_game'   , passport.authMiddleware(), add_game   );
	//app.post('/add_play'   , passport.authMiddleware(), add_play   );
	app.post('/add_availability', passport.authMiddleware(), add_availability);
	app.post('/add_caretaker_type_of_pet', passport.authMiddleware(), add_caretaker_type_of_pet);
	app.post('/add_caretaker', passport.authMiddleware(), update_caretaker_status);
	app.post('/edit_caretaker_price_of_pet', passport.authMiddleware(), edit_caretaker_price_of_pet);
	
	app.post('/reg_user'   , passport.antiMiddleware(), reg_user   );

	/* LOGIN */
	app.post('/login', passport.authenticate('local', {
		successRedirect: '/dashboard',
		failureRedirect: '/'
	}));
	
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
	var ctx = 0, idx = 0, tbl, total;
	if(Object.keys(req.query).length > 0 && req.query.p) {
		idx = req.query.p-1;
	}
	pool.query(sql_query.query.page_lims, [idx*10], (err, data) => {
		if(err || !data.rows || data.rows.length == 0) {
			tbl = [];
		} else {
			tbl = data.rows;
		}
		pool.query(sql_query.query.ctx_games, (err, data) => {
			if(err || !data.rows || data.rows.length == 0) {
				ctx = 0;
			} else {
				ctx = data.rows[0].count;
			}
			total = ctx%10 == 0 ? ctx/10 : (ctx - (ctx%10))/10 + 1;
			console.log(idx*10, idx*10+10, total);
			if(!req.isAuthenticated()) {
				res.render('index', { page: '', auth: false, tbl: tbl, ctx: ctx, p: idx+1, t: total });
			} else {
				basic(req, res, 'index', { page: '', auth: true, tbl: tbl, ctx: ctx, p: idx+1, t: total });
			}
		});
	});
}
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
function dashboard(req, res, next) {
	basic(req, res, 'dashboard', {
		cannot_go_to_caretaker_page_msg: msg(req, 'add-caretaker', '', 'You are not a caretaker. You can only view caretaker page if you are a caretaker. You can enable it below.'),
		caretaker_add_msg: msg(req, 'caretaker', 'You are now a caretaker', 'Error in updating caretaker status. You are already a caretaker.'),
		info_msg: msg(req, 'info', 'Information updated successfully', 'Error in updating information'),
		credcard_msg: msg(req, 'creditcard', 'Credit card updated successfully', 'Error in updating credit card'),
		pass_msg: msg(req, 'pass', 'Password updated successfully', 'Error in updating password'), auth: true });
}

// PET OWNER'S MANAGE PET
function managepet(req, res, next) {

	
}

//CARETAKER FUNCTION
function caretaker(req, res, next) {
	var ctx = 0, avg = 0, tbl;
	var ctx2 = 0, tbl2;
	var pet_ctx = 0, pet_tbl;
	var caretaker_tbl;
	var caretaker_pet_tbl;
	
	pool.query(sql_query.query.find_caretaker, [req.user.username], (err, data) => {
		if (err || !data.rows || data.rows.length == 0) {
			//Not a caretaker
			console.error("NOT A CARETAKER");

			res.redirect('/dashboard?add-caretaker=fail');
		} else {
			pool.query(sql_query.query.all_availability, [req.user.username], (err, data) => {
				if(err || !data.rows || data.rows.length == 0) {
					ctx = 0;
					tbl = [];
				} else {
					ctx = data.rows.length;
					tbl = data.rows;
				}

				pool.query(sql_query.query.all_caretaker_pettypeprice, [req.user.username], (err, data) => {
					if(err || !data.rows || data.rows.length == 0) {
						ctx2 = 0;
						tbl2 = [];
					} else {
						ctx2 = data.rows.length;
						tbl2 = data.rows;
					}

					pool.query(sql_query.query.all_pet_types, (err, data) => {
						if (err || !data.rows || data.rows.length == 0) {
							pet_ctx = 0;
							pet_tbl = [];
						} else {
							pet_ctx = data.rows.length;
							pet_tbl = data.rows;
						}

						pool.query(sql_query.query.caretaker_fulltime_parttime, [req.user.username], (err, data) => {
							if (err || !data.rows || data.rows.length == 0) {
								caretaker_tbl = [];
							} else {
								caretaker_tbl = data.rows;
							}

							pool.query(sql_query.query.all_caretaker_pettypeprice, [req.user.username], (err, data) => {
								if (err || !data.rows || data.rows.length == 0) {
									caretaker_pet_tbl = [];
								} else {
									caretaker_pet_tbl = data.rows;
								}

								basic(req, res, 'caretaker',
									{ ctx: ctx, tbl: tbl, ctx2: ctx2, tbl2: tbl2, pet_ctx: pet_ctx, pet_tbl: pet_tbl,
										caretaker_tbl: caretaker_tbl, caretaker_pet_tbl: caretaker_pet_tbl,
										date_msg: msg(req, 'add-availability', 'Date added successfully', 'Cannot add this date to availability'),
										caretaker_pet_type_msg: msg(req, 'add-pet_type', 'Type of pet added successfully', 'Failed in adding type of pet, pet is already in the table'),
										caretaker_pet_price_msg: msg(req, 'edit-pet_price', 'Pet price edited successfully', 'Failed in editing pet price'),
										auth: true });
							})
						})
					})
				});
			});
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
function update_info(req, res, next) {
	var username  = req.user.username;
	var name = req.body.name;
	var area = req.body.area;
	//var firstname = req.body.firstname;
	//var lastname  = req.body.lastname;
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

function add_caretaker(req, res, next) {
	var username = req.user.username;

	pool.query(sql_query.query.add_caretaker, [username], (err, data) => {
		if (err) {
			console.error("Error in adding caretaker, ERROR: " + err);
			res.redirect('/caretaker?add-caretaker=fail');
		}
	});
}

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

function add_availability(req, res, next) {
	var username = req.user.username;
	var date = req.body.date;

	pool.query(sql_query.query.find_caretaker, [username], (err, data) => {
		if (data.rowCount == 0) {
			add_caretaker(req, res, next);
		}
		pool.query(sql_query.query.add_availability, [username, date], (err, data) => {
			if (err) {
				console.error("Error in adding availability, ERROR: " + err);
				res.redirect('/caretaker?add-availability=fail');
			} else {
				res.redirect('/caretaker?add-availability=pass');
			}
		})

	});
}

//Only add pet-type for caretaker
function add_caretaker_type_of_pet(req, res, next) {
	var username = req.user.username;
	var type = req.body.type;
	var price = req.body.price;

	pool.query(sql_query.query.find_caretaker, [username], (err, data) => {
		//If caretaker is not in caretaker table
		if (data.rowCount == 0) {
			//Add to caretaker table
			add_caretaker(req, res, next);
		}
		pool.query(sql_query.query.find_pettypes, [type], (err_pettype, data_pettype) => {
			if (data_pettype.rowCount == 0) {
				res.redirect('/caretaker?add-pet_type=fail');
			} else {
				//Pet type exist
				pool.query(sql_query.query.find_caretaker_pricing, [username, type], (err_3, data_caretakerpricing) => {
					//Pet type is in caretaker's table
					if (data_caretakerpricing.rowCount == 0) {
						//No pet type within CareTakerPricing table, add
						if (price == "") {
							price = null;
						}

						pool.query(sql_query.query.add_caretaker_type_of_pet, [username, type, price], (err4, data4) => {
							if (err4) {
								console.error("Error in adding pet type + price, ERROR: " + err);
								res.redirect('/caretaker?add-pet_type=fail');
							} else {
								res.redirect('/caretaker?add-pet_type=pass');
							}
						})
					} else {
						//Pet type already existed in the Caretaker's table
						console.error("Pet type already existed in the table, cannot add");
						res.redirect('/caretaker?add-pet_type=fail');
					}
				})
			}
		})
	});
}

//Only edit price for caretaker, pet must exist first in caretaker's table already
function edit_caretaker_price_of_pet(req, res, next) {
	var username = req.user.username;
	var type = req.body.type;
	var price = req.body.price;
	var caretaker_tbl;

	pool.query(sql_query.query.find_caretaker, [username], (err, data) => {
		//If caretaker is not in caretaker table, not it's not possible as user cannot access this page
		if (data.rowCount == 0) {
			//Add to caretaker table
			add_caretaker(req, res, next);
		}
		pool.query(sql_query.query.find_pettypes, [type], (err_pettype, data_pettype) => {
			if (data_pettype.rowCount == 0) {
				res.redirect('/caretaker?edit-pet_price=fail');
			} else {
				//Pet type exist
				pool.query(sql_query.query.find_caretaker_pricing, [username, type], (err_3, data_caretakerpricing) => {
					//Pet type is not in caretaker's table
					if (data_caretakerpricing.rowCount == 0) {
						console.error("Error in adding pet type + price, ERROR: " + err);
						res.redirect('/caretaker?edit-pet_price=fail');
					} else {
						//Pet type already existed in the Caretaker's table
						pool.query(sql_query.query.caretaker_fulltime_parttime, [username], (err6, data6) => {
							if (err6 || !data6.rows || data6.rows.length == 0) {
								caretaker_tbl = [];
							} else {
								caretaker_tbl = data.rows;

								//Part-timer
								if (caretaker_tbl[0].is_fulltime == false) {
									pool.query(sql_query.query.update_caretaker_pettype_price, [username, type, price], (err5, data5) => {
										if (err5) {
											console.error("Error in updating pet type + price, ERROR: " + err);
											res.redirect('/caretaker?edit-pet_price=fail');
										} else {
											res.redirect('/caretaker?edit-pet_price=pass');
										}
									})
								} else {
									console.error("Full-timer, cannot update price");
									res.redirect('/caretaker?edit-pet_price=fail');
								}
							}
						})
					}
				})
			}
		})
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
	var username  = req.body.username;
	var password  = bcrypt.hashSync(req.body.password, salt);
	var name = req.body.name;
	var area  = req.body.area;
	pool.query(sql_query.query.add_user, [username,password,name,area], (err, data) => {
		if(err) {
			console.error("Error in adding user", err);
			res.redirect('/register?reg=fail');
		} else {
			pool.query(sql_query.query.add_petowner, [username], (err2, data) => { 
				if (err2) {
					console.error("Error in adding pet owner", err2);
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
	});
}


// LOGOUT
function logout(req, res, next) {
	req.session.destroy()
	req.logout()
	res.redirect('/')
}

module.exports = initRouter;