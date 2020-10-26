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
	all_availability: 'SELECT * FROM CareTakerAvailability WHERE username=$1 ORDER BY date ASC',
	all_caretaker_pettypeprice: 'SELECT * FROM CareTakerPricing WHERE username=$1 ORDER BY pet_type ASC',
	all_pet_types: 'SELECT * FROM PetTypes ORDER BY name ASC',
	caretaker_fulltime_parttime: 'SELECT is_fulltime FROM CareTaker WHERE username=$1',

	// Insertion
	add_game: 'INSERT INTO user_games (username, gamename) VALUES($1,$2)',
	add_play: 'INSERT INTO game_plays (user1, user2, gamename, winner) VALUES($1,$2,$3,$4)',
	add_user: 'INSERT INTO Users (username, password, name, area) VALUES ($1,$2,$3,$4)',
	add_pet: 'INSERT INTO Pet (name, pet_type, owner_username) VALUES ($1, $2, $3)',
	add_caretaker: 'INSERT INTO CareTaker (username) VALUES ($1)',
	add_availability: 'INSERT INTO CareTakerAvailability (username, date) VALUES ($1,$2)',
	add_caretaker_pet_types: 'INSERT INTO PetTypes (name) VALUES ($1)',
	add_caretaker_type_of_pet: 'INSERT INTO CareTakerPricing (username, pet_type, price) VALUES ($1,$2,$3)',
	
	//get caretaker ratings to display
	get_rating: 'SELECT GET_RATING(username) FROM CareTaker WHERE username = $1',
	get_all_rating: 'SELECT GET_RATING(username) FROM CareTaker',
	// Login
	user: 'SELECT * FROM Users WHERE username=$1',
	
	// Update
	update_information: 'UPDATE Users SET name=$2, area=$3 WHERE username=$1',
	update_pass: 'UPDATE Users SET password=$2 WHERE username=$1',
	update_credcard: 'UPDATE PetOwner SET credit_card_number=$2 WHERE username=$1',
	update_caretaker_pettype_price: 'UPDATE CareTakerPricing SET price=$3 WHERE username=$1 AND pet_type=$2',
	
	// Search
	search_game: 'SELECT * FROM game_list WHERE lower(gamename) LIKE $1',
	find_caretaker: 'SELECT * FROM CareTaker WHERE username=$1',
	find_pettypes: 'SELECT * FROM PetTypes WHERE name=$1',
	find_caretaker_pricing: 'SELECT * FROM CareTakerPricing WHERE username=$1 AND pet_type=$2',
}

module.exports = sql