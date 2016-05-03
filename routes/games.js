var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Game = mongoose.model('Game');
var multer = require('multer');
var fs = require('fs');

/**
 * @api {get} /games Get Games List
 * @apiName GetGames
 * @apiGroup Games
 *
 * @apiSuccess {Array} games Array of games.
 */
router.get('/', function(req, res, next) {
	Game.find({}, function(err, games) {
		res.json(games);
	});
});

/**
 * @api {post} /games Create New Game
 * @apiName CreateGame
 * @apiGroup Games
 *
 * @apiParam {String} name Name of the creator.
 *
 * @apiSuccess {Object} game The created game object.
 */
router.post('/', function(req, res, next) {
	// make sure that a player name was provided
	if (!req.body.name || req.body.name == '')
		return res.status(400).json({ message: 'No player name was provided.' });

	// generate random 4 digit game identifier
	var game = new Game();
	game.code = game.generateCode();
	game.players.push({
		name: req.body.name,
		number: 0,
		creator: true
	});
	game.numPlayers = 1;

	// TODO: make sure the generated code is unique
	game.save();

	// create a folder for uploaded drawings for this game
	fs.mkdir('public/uploads/'+game._id);
	res.json(game);
});

/**
 * @api {post} /games/join Join a Game
 * @apiName JoinGame
 * @apiGroup Players
 *
 * @apiParam {String} code Game join code.
 * @apiParam {String} name Name of the player.
 *
 * @apiSuccess {Object} game The joined game object.
 */
router.post('/join', function(req, res, next) {
	// make sure that a game code and player name were both specified
	if (!req.body.code || req.body.code == '')
		return res.status(400).json({ message: 'No game code was provided.' });
	if (!req.body.name || req.body.name == '')
		return res.status(400).json({ message: 'No player name was provided.' });

	// get the game specified by the four digit code
	Game.findOne({ code: req.body.code }, function (err, game) {
		if (err)
			next(err);

		// make sure that we found a game with that code
		if (game == null)
			return res.status(404).json({ message: 'The game could not be found.' });

		// make sure the game hasn't already started
		if (game.started == true)
			return res.status(403).json({ message: 'The game has already started.' });

		// add the new player to the game
		game.addPlayer(req.body.name);
		game.save();

		res.json(game);
	});
});

/**
 * @api {get} /game/:game/players Request Player List
 * @apiName GetPlayers
 * @apiGroup Players
 *
 * @apiParam {String} id Game ID.
 *
 * @apiSuccess {Array} players List of players.
 * @apiSuccess {Boolean} started  Whether or not the game has started.
 */
router.get('/:game/players', function(req, res, next) {
	res.json({
		players: req.game.players,
		started: req.game.started
	});
});

/**
 * @api {post} /games/:id/start Start the Game
 * @apiName StartGame
 * @apiGroup Games
 *
 * @apiParam {String} id Game ID.
 *
 * @apiSuccess {Boolean} started Whether or not the game started.
 */
router.post('/:game/start', function(req, res, next) {
	// mark the game as started in the database
	req.game.started = true;

	// fill the words array with empty objects for later
	for (var i = 0; i < req.game.numPlayers; i++) {
		req.game.words.push({});
	}

	// save the game
	req.game.save();

	// return a json object saying the game has started
	res.json({
		started: true
	});
});

/**
 * @api {post} /game/:id/words Submit Word
 * @apiName SubmitWord
 * @apiGroup Words
 *
 * @apiParam {String} id Game ID.
 * @apiParam {Number} creator Number of the player who submitted the word.
 * @apiParam {String} word The word to be submitted.
 *
 * @apiSuccess {Array} words Array of words submitted.
 */
router.post('/:game/words', function(req, res, next) {
	// make sure we have the player number for the player submitting the word
	if (req.body.creator == null || req.body.creator > req.game.numPlayers)
		return res.status(400).json({ message: 'No valid player was provided.' });

	// make sure we actually have a word
	if (!req.body.word || req.body.word == '')
		return res.status(400).json({ message: 'No word was provided.' });

	// put the word into the array
	req.game.words[req.body.creator].creator = req.body.creator;
	req.game.words[req.body.creator].word = req.body.word;
	req.game.words[req.body.creator].created = Date.now();
	req.game.save();

	res.json(req.game.words);
});

/**
 * @api {get} /game/:gameID/words/:wordID Request Word information
 * @apiName GetWord
 * @apiGroup Words
 *
 * @apiParam {String} gameID Game ID.
 * @apiParam {Number} wordID Word number.
 *
 * @apiSuccess {Object} word Requested word.
 */
router.get('/:game/words/:word', function(req, res, next) {
	// make sure a valid word was specified
	if (req.params.word == null || req.params.word > req.game.numPlayers)
		return res.status(400).json({ message: 'No valid word was specified.' });

	// check if the word is in use
	if (req.game.words[req.params.word].inUse)
		res.status(423).json({ message: 'The requested word is still in use.' });

	// return the word if it's ready to be used
	res.json(req.game.words[req.params.word]);

	// mark the word as in use
	req.game.words[req.params.word].inUse = true;
	req.game.save();
});

/**
 * @api {post} /games/:gameID/words/:wordID/answers Submit Answer
 * @apiName SubmitAnswer
 * @apiGroup Answers
 *
 * @apiParam {String} gameID Game ID.
 * @apiParam {Number} wordID Number of the word.
 * @apiParam {Number} player The number of the player submitting the answer.
 * @apiParam {File} drawing The drawing being submitted (optional).
 * @apiParam {String} word The word being submitted as an answer (optional).
 *
 * @apiSuccess {Object} game The game object.
 */
router.post('/:game/words/:word/answers', multer({
	dest: './public/uploads/tmp',
	limits: {
		fileSize: 1000000,
		files: 1
	}}).single('drawing'), function(req, res, next) {
	// make sure we have the player number for the player submitting the answer
	if (req.body.player == null || req.body.player > req.game.numPlayers)
		return res.status(400).json({ message: 'No valid player was provided.' });

	// check if we have a drawing or just a word
	if (req.file == null) {
		// make sure we have a word if we don't have a drawing
		if (!req.body.word || req.body.word == '')
			return res.status(400).json({ message: 'No word or drawing was provided.' });
		isDrawing = false;
	} else {
		// move the image from the temp folder to the folder for the game
		fs.rename(req.file.path,'public/uploads/'+req.game._id+'/'+req.file.filename);
		req.file.path = 'public/uploads/'+req.game._id+'/'+req.file.filename;
		isDrawing = true;
	}

	// create the answer object
	var answer = {
		creator: req.body.player,
		isDrawing: isDrawing
	};

	if (isDrawing) {
		answer.drawingFilename = req.file.filename;
	}
	else {
		answer.word = req.body.word;
	}
	req.game.words[req.params.word].answers.push(answer);

	// unlock the word so the next player can go
	req.game.words[req.params.word].inUse = false;

	// save and send info back to the player
	req.game.save();
	res.json(req.game);
});

/**
 * @api {get} /games/:gameID/words Get Word List
 * @apiName GetWords
 * @apiGroup Words
 *
 * @apiParam {String} gameID Game ID.
 *
 * @apiSuccess {Array} words Array of word objects.
 */
router.get('/:game/words', function(req, res, next) {
	res.json(req.game.words);
});

/* Get game object when a game param is supplied */
router.param('game', function(req, res, next, id) {
	var query = Game.findById(id);
	query.exec(function (err, game){
		if (err)
			return next(err);
		if (!game)
			return next(new Error('The game could not be found'));

		req.game = game;
		return next();
	});
});

module.exports = router;
