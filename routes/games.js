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

module.exports = router;
