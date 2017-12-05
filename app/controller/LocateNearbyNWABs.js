const getTimings = require('./BusTiming-Helper/get-timings'),
    BusStop = require('../models/BusStop');

const BusStopsLocator = require('./BusStopsLocator'),
BusTimings = require('./BusTimings');

var timingsCache = {};

function refreshCache() {
	getTimings(timings => {
		timingsCache = timings;
	});
}

setInterval(refreshCache, 20 * 1000);
refreshCache();

function correctBuses(timings, operator) {
	return corrected = timings.map(bus => {
		if (bus.busType <= 2 && operator != 'SBS Transit') {
			bus.isWAB = true;
		}
		return bus;
	});
}

exports.index = (req, res) => {
    res.render('bus/stops/nearby/nwab');
}

exports.locate = (req, res) => {
    if (!'lat' in req.body || !'long' in req.body || !'dist' in req.body) {
        res.status(400).json({
            error: 'Invalid Parameters'
        });
        return;
    }

    BusStopsLocator.locateBusStops(req.body.lat, req.body.long, 0.0066 * req.body.dist, busStops => {
        var finalTimings = {};
        busStops.forEach(busStop => {
            var busStopCode = busStop.busStopCode;
            var timings = timingsCache[busStopCode];

            var localTimings = {};
            Object.keys(timings).forEach(busService => {
                var serviceTimings = timings[busService].filter(timing => !timing.isWAB);
                if (serviceTimings.length > 0) {
                    localTimings[busService] = serviceTimings;
                }
            });

            if (Object.keys(localTimings).length > 0)
                finalTimings[busStopCode] = localTimings;
        });

        var allPromises = [];

        var processedTimings = {};

        Object.keys(finalTimings).forEach(busStopCode => {
            allPromises.push(new Promise((y, n) => {
                var timings = finalTimings[busStopCode];

                var services = Object.keys(timings);

                var promises = [];

                services.forEach(service => {
                    promises.push(BusTimings.getServiceData(service, busStopCode, busStopCode).then(data => {
                        var corrected = correctBuses(timings[service], data.operator).filter(bus => !bus.isWAB);
                        if (corrected == 0) {
                            delete timings[service];
                            return true;
                        }

                        timings[service] = Object.assign(corrected, data);
                        return true;
                    }));
                });

                Promise.all(promises).then(() => {
                    if (Object.keys(timings).length > 0)
                        processedTimings[busStopCode] = timings;
                    y();
                });
            }));
        });

        Promise.all(allPromises).then(() => {
            console.log(processedTimings)
            var busStops = {};
            var promises = [];

            Object.keys(processedTimings).forEach(busStopCode => {
                var services = Object.keys(processedTimings[busStopCode]);
                services.forEach(service => {
                    var busStopData = new Promise((resolve, reject) => {
                        BusStop.findOne({
                            busStopCode: busStopCode
                        }, (err, busStop) => {
                            busStops[busStopCode] = busStop;
                            resolve();
                        });
                    });
                    promises.push(busStopData);
                });
            });


        	var timingDiff = (a, b) => {
        		var diff = new Date(Math.abs(a - b));
        		return {
        			minutes: diff.getUTCMinutes(),
        			seconds: diff.getUTCSeconds(),
        		}
        	};

        	Promise.all(promises).then(() => {
        		res.render('bus/timings/timing-search/results.pug', {
        			busStops,
        			timingDiff,
        			possibleTimings: processedTimings
        		})
        	});
        });

    });
}
