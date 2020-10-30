const sql = {}

sql.query = {
	// Counting & Average
	count_play: 'SELECT COUNT(winner) FROM game_plays WHERE user1=$1 OR user2=$1',
	count_wins: 'SELECT COUNT(winner) FROM game_plays WHERE winner=$1',
	avg_rating: 'SELECT AVG(rating) FROM user_games INNER JOIN game_list ON user_games.gamename=game_list.gamename WHERE username=$1',
	
	// Information
	page_game: 'SELECT * FROM game_list WHERE ranking >= $1 AND ranking <= $2 ORDER BY ranking ASC',
	page_lims: 'SELECT * FROM game_list ORDER BY ranking ASC LIMIT 10 OFFSET $1',
	ctx_games: 'SELECT COUNT(*) FROM game_list',
	all_games: 'SELECT ranking,game_list.gamename AS game,rating FROM user_games INNER JOIN game_list ON user_games.gamename=game_list.gamename WHERE username=$1 ORDER BY ranking ASC',
	all_plays: 'SELECT gamename AS game, user1, user2, winner FROM game_plays WHERE user1=$1 OR user2=$1',


	//Our queries
	all_availability: 'SELECT * FROM CareTakerAvailability WHERE username=$1 ORDER BY date ASC',
	all_caretaker_pettypeprice: 'SELECT * FROM CareTakerPricing WHERE username=$1 ORDER BY pet_type ASC',
	all_pet_types: 'SELECT * FROM PetTypes ORDER BY pet_type',
	caretaker_fulltime_parttime: 'SELECT is_fulltime FROM CareTaker WHERE username=$1',
	list_of_pets: 'SELECT * FROM Pet WHERE owner_username=$1',
	list_of_specreq: 'SELECT * FROM PetSpecialRequirements WHERE owner_username=$1',
	all_specreq: 'SELECT * FROM SpecialRequirements',
	all_bid:'SELECT * FROM Bids WHERE username=$1',
	all_transfer_methods: 'SELECT  enum.enumlabel AS value FROM pg_enum AS enum JOIN pg_type AS type ON (type.oid = enum.enumtypid) WHERE type.typname =\'transfer_methods\' GROUP by type.typname, enum.enumlabel',
	all_payment_types: 'SELECT enum.enumlabel AS value FROM pg_enum AS enum JOIN pg_type AS type ON (type.oid = enum.enumtypid) WHERE type.typname =\'payment_types\' GROUP by type.typname, enum.enumlabel',

	// Insertion
	add_game: 'INSERT INTO user_games (username, gamename) VALUES($1,$2)',
	add_play: 'INSERT INTO game_plays (user1, user2, gamename, winner) VALUES($1,$2,$3,$4)',
	add_user: 'INSERT INTO Users (username, password, name, area) VALUES ($1,$2,$3,$4)',
	add_pet: 'INSERT INTO Pet (pet_name, pet_type, owner_username) VALUES ($1, $2, $3)',
	add_specreq: 'INSERT INTO PetSpecialRequirements (owner_username, pet_name, special_requirement) VALUES ($1, $2, $3)',
	add_caretaker: 'INSERT INTO CareTaker (username) VALUES ($1)',
	make_bid:'INSERT INTO Bids (owner_username, pet_name, caretaker_username, start_date, end_date, transfer_method, payment_type) VALUES ($1,$2,$3,$4,$5,$6,$7)',
	add_rating_review:'INSERT INTO Bids (rating, review) VALUES ($1, $2)',
	add_availability: 'INSERT INTO CareTakerAvailability (username, date) VALUES ($1,$2)',
	add_caretaker_pet_types: 'INSERT INTO PetTypes (pet_type) VALUES ($1)',
	add_caretaker_type_of_pet: 'INSERT INTO CareTakerPricing (username, pet_type) VALUES ($1,$2)',
	
	//get caretaker ratings to display
	get_rating: 'SELECT GET_RATING(username) FROM CareTaker WHERE username = $1',
	get_all_rating: 'SELECT GET_RATING(username) FROM CareTaker',
	// Login
	user: 'SELECT * FROM Users WHERE username=$1',

	
	get_all_bids: 'SELECT * FROM Bids',
	get_all_pending_bids: 'SELECT * FROM Bids WHERE status = \'PENDING\'',
	get_all_accepted_bids: 'SELECT * FROM Bids WHERE status = \'ACCEPTED\'',
	get_all_rejected_bids: 'SELECT * FROM Bids WHERE status = \'REJECTED\'',

	//get top available caretaker
	//may be buggy
	get_top_available_caretaker: 'SELECT cp.username, GET_RATING(cp.username) FROM caretakerpricing cp LEFT OUTER JOIN caretakeravailability ca on cp.username = ca.username WHERE ca.date BETWEEN $1 AND $2 AND cp.pet_type=$3 GROUP BY cp.username ORDER BY GET_RATING(cp.username) DESC, cp.username LIMIT 10', 

	//inputs: 1. startdate, 2. enddate, 3.petowner, 4. petname
	get_top_available_caretaker: 'SELECT caretaker_username, rate FROM ALLAVAILABLE($1, $2, $3, $4)',

	//get pending bid for caretaker
	get_pending_bids_for_caretaker: 'SELECT * FROM Bids WHERE status = \'PENDING\' AND caretaker_username = $1',

	//get all accepted bid for caretaker
	get_all_accepted_bids_for_caretaker: 'SELECT * FROM Bids WHERE status = \'ACCEPTED\' AND caretaker_username = $1',

	//get all accepted bid for caretaker
	get_all_completed_bids_for_caretaker: 'SELECT * FROM Bids WHERE status = \'COMPLETED\' AND caretaker_username = $1',

	//delete availability for caretaker
	//inputs: 1. username, 2. date
	delete_availability: 'DELETE FROM CARETAKERAVAILABILITY WHERE username = $1 AND date = $2',

	// Update
	update_information: 'UPDATE Users SET name=$2, area=$3 WHERE username=$1',
	update_pass: 'UPDATE Users SET password=$2 WHERE username=$1',
	update_credcard: 'UPDATE PetOwner SET credit_card_number=$2 WHERE username=$1',
	update_pet: 'UPDATE Pet SET pet_name=$2 WHERE pet_name=$1 AND owner_username=$3',
	update_pet_status: 'UPDATE Pet SET enabled=$3 WHERE pet_name=$2 AND owner_username=$1',
	update_caretaker_pettype_price: 'UPDATE CareTakerPricing SET price=$3 WHERE username=$1 AND pet_type=$2',
	update_caretaker_accepted_bid: 'UPDATE Bids SET status=\'ACCEPTED\' WHERE caretaker_username=$1 AND owner_username=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5',
	update_caretaker_rejected_bid: 'UPDATE Bids SET status=\'REJECTED\' WHERE caretaker_username=$1 AND owner_username=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5',
	//set complete bid params: caretaker_name, owner_name, pet_name start_date, end_date
	complete_bid: 'Update Bids SET status = \'COMPLETED\' WHERE caretaker_username=$1 AND owner_username=$2 AND pet_name=$3 AND start_date=$4 AND end_date=$5',
	// Search
	search_game: 'SELECT * FROM game_list WHERE lower(gamename) LIKE $1',
	find_caretaker: 'SELECT * FROM CareTaker WHERE username=$1',
	find_pettypes: 'SELECT * FROM PetTypes WHERE pet_type=$1',
	find_caretaker_pricing: 'SELECT * FROM CareTakerPricing WHERE username=$1 AND pet_type=$2',
	//get salary with 1. caretaker username 2. year(INTEGER) 3. month(INTEGER)
	get_salary_for_the_month: 'SELECT GET_SALARY($1, $2, $3)',
	//get all months salary
	get_salary_record: 'SELECT YR.y, MTH.m, GET_SALARY($1, YR.y, MTH.m) FROM generate_series(2020, 2020) as YR(y),  generate_series(1,12) as MTH(m) ORDER BY Mth.m ASC'
}

sql.admin = {
	create_admin: 'INSERT INTO PCSAdmin (username, password, enabled) VALUES ($1, $2, true)',
	login: 'SELECT * FROM PCSAdmin WHERE username=$1 AND enabled=true',
	get_pet_type_pricing: 'SELECT * FROM PetTypes ORDER BY pet_type',
	update_pet_type_pricing: 'UPDATE PetTypes SET base_price=$2 WHERE pet_type=$1',
	month_pets_taken_care: 'SELECT COUNT(*) AS month_pet_count FROM Bids WHERE status=\'ACCEPTED\' AND start_date BETWEEN cast(date_trunc(\'month\', to_date($1, \'YYYY-MM-DD\')) as date) AND (cast(date_trunc(\'month\', to_date($1, \'YYYY-MM-DD\'))  + interval \'1 month\' as date))',
	month_caretaker_salary: 'SELECT COALESCE(SUM(total_price), 0.0) AS month_total_salary ' +
		'FROM Bids ' +
		'WHERE status = \'ACCEPTED\' ' +
		'  AND start_date BETWEEN cast(date_trunc(\'month\', to_date($1, \'YYYY-MM-DD\')) as date) ' +
		'    AND (cast(date_trunc(\'month\', to_date($1, \'YYYY-MM-DD\'))  + interval \'1 month\' as date));',
	//get all ratings: (caretaker_username, rating)
	get_rating_for_all_caretakers: 'SELECT * FROM GETALLRATINGS()'
}

module.exports = sql
