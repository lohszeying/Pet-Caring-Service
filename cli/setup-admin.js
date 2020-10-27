require('dotenv').load();

const bcrypt = require('bcrypt');
const round = 10;
const salt = bcrypt.genSaltSync(round);

const {Pool} = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const sql_query = require('../sql');

const consoleArgs = process.argv.slice(2);
const username = consoleArgs[0];
const password = consoleArgs[1];

const passwordHash = bcrypt.hashSync(password, salt);

pool.query(sql_query.admin.create_admin, [username, passwordHash], (err, data) => {
    if (err) {
        console.error("Cannot create admin");
        console.error(err);
    } else {
        console.log("Admin created successfully");
    }
});
