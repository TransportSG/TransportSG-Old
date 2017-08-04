const request = require('request'),
    {JSDOM} = require('jsdom'),
    BusService = require('../../app/models/BusStop'),
    mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const config = require('../../config');

function connect() {
	return mongoose.connect('mongodb://' + config.dbUser + ':' + config.dbPass + '@' + config.database + '?authSource=admin', {
		server: {
			socketOptions: {
				keepAlive: 1
			},
			reconnectTries: 5
		}
	}, err => {
		if (err) throw err;
	});
}

connect();
