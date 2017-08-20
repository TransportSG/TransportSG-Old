mongoose = require('mongoose'),
mongoose.Promise = global.Promise;

const BusService = require('./app/models/BusService'),
    BusStop = require('./app/models/BusStop');

const config = require('./config');

function connect() {
	return mongoose.connect('mongodb://' + config.dbUser + ':' + config.dbPass + '@' + config.database + '?authSource=admin', {
    	// return mongoose.connect('mongodb://localhost', {
        socketTimeoutMS: 180000,
        keepAlive: true,
        reconnectTries: Infinity,
        useMongoClient: true
	});
}

function getTerminalForService(busService, givenDestination) {
	return new Promise(function(resolve, reject) {
		BusStop.findOne({
			busStopCode: givenDestination
		}, (err, marker) => {
			BusService.findOne({
				fullService: busService.replace(/[WG]/g, '').replace('C', '#')
			}, (err, service) => {
				marker.busServices.forEach(mark => {
					if (mark.service === busService) {
						var direction = mark.direction;
                        BusStop.findOne({
                            busStopCode: service.interchanges[direction - 1]
                        }, (err, terminal) => {
                            resolve(terminal);
                        })
					}
				});
			});
		});
	});
}

connect().then(() => {
    getTerminalForService('985', 60059).then(terminal => {
        console.log('terminal')
        console.log(terminal);
    })
}).catch(err => {
	console.log(err);
});
