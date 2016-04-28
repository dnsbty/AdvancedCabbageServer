var mongoose = require('mongoose');

var GameSchema = new mongoose.Schema({
	code: String,
	created: { type: Date, default: Date.now },
	numPlayers: Number,
	players: [{
		name: String,
		number: Number,
		creator: { type: Boolean, default: false }
	}],
	words: [{
		creator: Number,
		word: String,
		numAnswers: Number,
		answers: [{
			creator: Number,
			isDrawing: { type: Boolean, default: false },
			word: String,
			drawingUrl: String
		}],
		created: { type: Date, default: Date.now }
	}]
});

GameSchema.methods.generateCode = function () {
	// generate a 4 digit alphanumeric join code
	return Math.random().toString(36).slice(2,6).toUpperCase();
}

GameSchema.methods.addPlayer = function (name) {
	var newPlayer = {
		name: name,
		number: this.players.length,
		creator: false
	};
	this.players.push(newPlayer);
}
 
mongoose.model('Game', GameSchema);
