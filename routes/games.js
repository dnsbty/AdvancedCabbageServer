var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Game = mongoose.model('Game');
var multer = require('multer');
var fs = require('fs');

/* GET list of all games. */
router.get('/', function(req, res, next) {
	Game.find({}, function(err, games) {
		res.json(games);
	});
});

/* POST new game. */
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

/* POST new player to game. */
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

		// add the new player to the game
		game.addPlayer(req.body.name);
		game.save();

		res.json(game);
	});
});

/* GET list of players in the game. */
router.get('/:game/players', function(req, res, next) {
	res.json({
		players: req.game.players,
		started: req.game.started
	});
});

/* POST start game command. */
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

/* POST new word to a game. */
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
	req.game.words[req.body.creator].created = Date.now;
	req.game.save();

	res.json(req.game.words);
});

/* GET a word. */
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

/* POST new answer to a word. */
router.post('/:game/words/:word/answers', multer({
	dest: './public/uploads/tmp',
	limits: {
		fileSize: 1000000,
		files: 1
	}}).single('drawing'), function(req, res, next) {
	// make sure we have the player number for the player submitting the word
	if (req.body.player === null)
		return res.status(400).json({ message: 'No player was provided.' });

	// check if we have a drawing or just a word
	if (req.file === null) {
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

/* GET all words. */
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
