const mongoose = require('mongoose'),
    main = require('./main'),
    config = require('../../config');

mongoose.Promise = global.Promise;

function connect() {
	return mongoose.connect('mongodb://' + config.dbUser + ':' + config.dbPass + '@' + config.database + '?authSource=admin', {
        socketTimeoutMS: 600000,
        keepAlive: true,
        reconnectTries: Infinity,
        useMongoClient: true
	});
}

connect().then(() => {
    main();
}).catch(err => {
    console.log(err);
});
