var mongoose = require('mongoose');

var GameSchema = new mongoose.Schema({
	code: String,
	created: { type: Date, default: Date.now },
	started: { type: Boolean, default: false },
	numPlayers: Number,
	players: [{
		name: String,
		number: Number,
		creator: { type: Boolean, default: false }
	}],
	words: [{
		creator: { type: Number, default: 0 },
		word: { type: String, default: '' },
		numAnswers: { type: Number, default: 0 },
		answers: [{
			creator: Number,
			isDrawing: { type: Boolean, default: false },
			word: String,
			drawingFilename: String
		}],
		created: { type: Date, default: Date.now },
		inUse: { type: Boolean, default: true }
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
	this.numPlayers++;
}
 
mongoose.model('Game', GameSchema);
