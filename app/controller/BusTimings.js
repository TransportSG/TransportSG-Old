const getTimings = require('./BusTiming-Helper/get-timings')
	BusStop = require('../models/BusStop'),
	BusService = require('../models/BusService'),
    asyncMap = require('../util').asyncMap;

var timingsCache = {};

function refreshCache() {
    getTimings(timings => {
        timingsCache = timings;
    });
}

setInterval(refreshCache, 30 * 1000);
refreshCache();

var cssMap = {
	'SBS Transit': 'sbst',
	'SMRT Buses': 'smrt',
	'Tower Transit Singapore': 'tts',
	'Go-Ahead Singapore': 'gas'
}

function isValidBusStopCode(busStopCode) {
	return !!busStopCode.match(/^\d{5}$/);
}

function correctBuses(timings, operator) {
	return timings.map(bus => {
		if (bus.busType === 2 && operator != 'SBS Transit') {
			bus.isWAB = true;
		}
		if (bus.busType === 2 && operator != 'SBS Transit') {
			bus.isWAB = true;
		}
        if (bus.busType === 3 && operator != 'SMRT Buses') {
            bus.busType = 1;
            bus.isWAB = true;
        }
		return bus;
	});
}

function getServiceNumber(service) {
    if (service.startsWith('NR')) {
        return service.replace(/[0-9]/g, '');
    } else if (service.startsWith('CT')) {
        return 'CT';
    } else
        return service.replace(/[A-Za-z#]/g, '');
}

function getServiceVariant(service) {
    if (service.startsWith('NR')) {
        return service.replace(/[A-Za-z#]/g, '');
    } else if (service.startsWith('CT')) {
        return service.replace(/CT/, '');
    } else
    return service.replace(/[0-9]/g, '').replace(/#/, 'C');
}

function getServiceData(busService, givenDestination) {
	return new Promise(function(resolve, reject) {
		BusService.findOne({
			fullService: busService.replace(/[WG]/g, '')
		}, (err, service) => {
			if (!service) {
				BusService.findOne({
					busStopCode: givenDestination
				}, (err, terminus) => {
					resolve({
                        terminal: terminus,
                        operator: 'unknown'
                    });
				});
				return;
			}

            function done(terminus) {
                resolve({
                    terminal: terminus,
                    operator: cssMap[service.operator],
                    serviceNumber: service.serviceNumber,
                    serviceVariant: service.variant || ''
                });
            }

			if (service.interchanges.indexOf(givenDestination) !== -1) {
				var index = 0;
				if (givenDestination == service.interchanges[service.interchanges.indexOf(givenDestination)] &&
					service.interchanges.length == 2) {
					index = 1 - service.interchanges.indexOf(givenDestination);
				} else {
					index = service.interchanges.indexOf(givenDestination);
				}
				BusStop.findOne({
					busStopCode: service.interchanges[index]
				}, (err, terminus) => {
	                done(terminus);
				})
				return;
			}

			var found = false;
			Object.keys(service.stops).slice(0, -1).forEach(d => {
				var direction = service.stops[d];
				direction.forEach((busStop, i) => {
					if (busStop.busStopCode == givenDestination) {
						done(direction[direction.length - 1]);
						found = true;
						return;
					}
				});
			});
			if (!found) {
				done({
					busStopCode: givenDestination,
					busStopName: 'Unknown Destination!'
				})
			}
		});
	});
}

exports.index = (req, res) => {
	var busStopCode = req.params.busStopCode;
	if (!isValidBusStopCode(busStopCode)) {
		res.render('bus/timings/invalid-bus-stop-code');
		return;
	}
	BusStop.findOne({
		busStopCode: busStopCode
	}, (err, busStop) => {
		if (!busStop) {
			res.render('bus/timings/invalid-bus-stop-code');
			return;
		}
        var timings = timingsCache[busStopCode];

        if (!timings) {
            res.render('bus/timings/stop', {
                timings: {},
				services: [],
                busStopCode: busStopCode,
                busStopName: busStop.busStopName
            });
            return;
        }

        var services = Object.keys(timings);

        var promises = [];

        services.forEach(service => {
            promises.push(getServiceData(service, busStopCode).then(data => {
                timings[service] = Object.assign(correctBuses(timings[service]), data);
                return true;
            }));
        });

        Promise.all(promises).then(() => {
            res.render('bus/timings/stop', {
                timings: timings,
				services: services.sort((a, b) => a.match(/(\d+)/)[0] - b.match(/(\d+)/)[0]),
                timingDiff: (a, b) => {
                    var diff = new Date(Math.abs(a - b));
                    return {
                        minutes: diff.getUTCMinutes(),
                        seconds: diff.getUTCSeconds(),
                    }
                },
                busStopCode: busStopCode,
                busStopName: busStop.busStopName
            });
        });
    });
}
