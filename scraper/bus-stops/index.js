const request = require('request'),
    {JSDOM} = require('jsdom'),
    BusStop = require('../../app/models/BusStop'),
    BusService = require('../../app/models/BusService');
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
        BusService.find({
            stops: {
                $elemMatch: {
                    $elemMatch: {
                        busStopCode: busStop.busStopCode
                    }
                }
            }
        }, (err, services) => {
            if (services === null) {services = []; console.log(busStop.busStopCode);}
            services = services.map(service => service.serviceNumber + service.variant);
            console.log(`${busStop.busStopCode}: ${services}`);
            remaining++;
            var busStopModel = new BusStop(Object.assign(busStop, {
                busServices: services
            }));
            var query = {busStopCode: busStop.busStopCode};
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
});

setTimeout(() => {
    setInterval(() => {
        console.log(`Waiting for ${remaining} more requests to finish`);
        if (remaining === 0) {
            mongoose.connection.close();
            process.exit(0);
        }
    }, 10000);
}, 60000);

connect();
