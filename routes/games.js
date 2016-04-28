var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Game = mongoose.model('Game');

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

	// TODO: make sure the generated code is unique
	game.save();
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

module.exports = router;
