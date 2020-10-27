const sql_query = require('../sql');

const passport = require('passport');
const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;

const authMiddleware = require('./middleware');
const antiMiddleware = require('./antimiddle');

// Postgre SQL Connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  //ssl: true
});

function findUser (username, callback) {
	pool.query(sql_query.query.user, [username], (err, data) => {
		if(err) {
			console.error("Cannot find user");
			return callback(null);
		}

		//Print whatever that is in that row
		//console.log(data.rows);

		if(data.rows.length == 0) {
			console.error("User does not exists?");
			return callback(null)
		} else if(data.rows.length == 1) {
			return callback(null, {
				username    : data.rows[0].username,
				name   : data.rows[0].name,
				area    : data.rows[0].area,
                passwordHash: data.rows[0].password,
			});
		} else {
			console.error("More than one user?");
			return callback(null);
		}
	});
}

function findAdmin(username, callback) {
    pool.query(sql_query.admin.login, [username], (err, data) => {
        if(err) {
            console.error("Cannot find admin");
            return callback(null);
        }

        if(data.rows.length === 0) {
            console.error("Admin does not exists?");
            return callback(null)
        } else if(data.rows.length === 1) {
            return callback(null, {
                username    : data.rows[0].username,
                passwordHash: data.rows[0].password,
            });
        } else {
            console.error("More than one admin?");
            return callback(null);
        }
    });
}

passport.serializeUser((user, cb) => {
    const userObject = {
        username: user.username,
        is_admin: false
    };

    // User has name, admin does not
    if (!user.hasOwnProperty('name')) {
        userObject.is_admin = true;
    }

    cb(null, userObject);
})

passport.deserializeUser((userObject, cb) => {
    if (userObject.is_admin) {
        findAdmin(userObject.username, cb);
    } else {
        findUser(userObject.username, cb);
    }
})

function initPassport () {
  passport.use(new LocalStrategy(
    (username, password, done) => {
      findUser(username, (err, user) => {
        if (err) {
          return done(err);
        }

        // User not found
        if (!user) {
          console.error('User not found');
          return done(null, false);
        }

        // Always use hashed passwords and fixed time comparison
        bcrypt.compare(password, user.passwordHash, (err, isValid) => {
          if (err) {
            return done(err);
          }
          if (!isValid) {
            return done(null, false);
          }
          return done(null, user);
        })
      })
    }
  ));

    passport.use('admin', new LocalStrategy({usernameField: 'username', passwordField: 'password'}, (username, password, done) => {
        findAdmin(username, (err, admin) => {
            if (err) {
                return done(err);
            }

            // admin not found
            if (!admin) {
                console.error('Admin not found');
                return done(null, false);
            }

            // Always use hashed passwords and fixed time comparison
            bcrypt.compare(password, admin.passwordHash, (err, isValid) => {
                if (err) {
                    return done(err);
                }
                if (!isValid) {
                    return done(null, false);
                }
                return done(null, admin);
            });
        });
    }));


  passport.authMiddleware = authMiddleware;
  passport.antiMiddleware = antiMiddleware;
	passport.findUser = findUser;
}

module.exports = initPassport;
