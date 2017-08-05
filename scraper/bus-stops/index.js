const request = require('request'),
    {JSDOM} = require('jsdom'),
    BusStop = require('../../app/models/BusStop'),
    mongoose = require('mongoose'),
    LTADataMall = require('ltadatamall'),
    {BusStopsAPI, APIKey} = LTADataMall;

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

var remaining = 0;

var busStopAPI = new BusStopsAPI(new APIKey(config.ltaAPIKey));
busStopAPI.getAllBusStops((err, busStops) => {
    busStops.forEach(busStop => {
        if (busStop.busStopCode.startsWith('N')) {
            return;
        }
        remaining++;
        var busStopModel = new BusStop(busStop);
        var query = {busStopCode: busStop.busStopCode*1};
        BusStop.findOne(query, (err, foundBusStop) => {
            if (!foundBusStop)
                busStopModel.save(err => {
                    if (err) console.log(err);
                    remaining--;
                });
            else
                BusStop.findOneAndUpdate(query, busStop, err => {
                    if (err) console.log(err);
                    remaining--;
                });
        });
    });
});

setTimeout(() => {
    setInterval(() => {
        console.log(`Waiting for ${remaining} more requests to finish`);
        if (remaining === 0) {
            mongoose.connection.close();
            process.exit(0);
        }
    }, 10000);
}, 15000);

connect();
