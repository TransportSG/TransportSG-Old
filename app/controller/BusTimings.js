const getTimings = require('./BusTiming-Helper/get-timings'),
BusStop = require('../models/BusStop'),
BusService = require('../models/BusService');

const BusDepotData = require('./support.json');

var TextParser = require('../../SimpleEnglishParser/index');

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

function correctBuses(timings, operator, service) {
	return corrected = timings.map(bus => {
		if (bus.busType <= 2 && operator != 'sbst') {
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

function objectType(object) {
    return Object.prototype.toString.call(object).match(/\[object (\w+)\]/)[1];
}

exports.getServiceData = (busService, givenDestination, currentStop) => {
	return new Promise(function(resolve, reject) {
		BusService.findOne({
			fullService: busService.replace(/[WG]/g, '')
		}, (err, service) => {
			if (!service) {
				resolve({
					terminal: currentStop,
					operator: cssMap['SMRT Buses'],
					serviceNumber: getServiceNumber(busService),
					serviceVariant: getServiceVariant(busService)
				});
				return;
			}


			function done(terminus) {
				resolve({
					terminal: terminus,
					operator: cssMap[service.operator],
					serviceNumber: service.serviceNumber,
					serviceVariant: getServiceVariant(busService)
				});
			}

			if (service.interchanges.indexOf(currentStop) !== -1) {
				var index = 0;
				if (service.interchanges.length == 2) {
					index = 1 - service.interchanges.indexOf(currentStop);
				} else {
					index = service.interchanges.indexOf(currentStop);
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
			promises.push(exports.getServiceData(service, busStopCode, busStopCode).then(data => {
				timings[service] = Object.assign(correctBuses(timings[service], data.operator, service), data);
					// timings[service] = Object.assign(timings[service], data);
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

exports.timingSearch = (req, res) => {
	res.render('bus/timings/timing-search/search.pug');
}

exports.performSearch = (req, res) => {
	if (!req.body.query) {
		res.status(400).json({
			error: 'No query provided!'
		});
		return;
	}

	var parsed = TextParser.parse(req.body.query, {
        services: {
            type: /(\d+[GWABC#M]?)/,
            canRepeat: true
        },
        wheelchair: ['wab', 'nwab'],
        type: ['SD', 'DD', 'BD'],
        depots: {
			type: ['SLBP', 'ARBP', 'BBDEP', 'HGDEP', 'BNDEP', 'AMDEP', 'KJDEP', 'WLDEP'],
			canRepeat: true
		}
    });

	var possibleTimings = {};

	parsed.services = parsed.services || [];
	parsed.depots = parsed.depots || [];

	if (!parsed.services.length && !parsed.depots.length) {
		res.end('Need to specify at least service or depot!');
		return;
	}

	for (var depot of parsed.depots) {
		parsed.services = parsed.services.concat(BusDepotData[depot]);
	}

	for (var service of parsed.services) {
		for (var busStopCode of Object.keys(timingsCache)) {
			var busStop = timingsCache[busStopCode];
			var busStopServices = Object.keys(busStop);

			if (busStopServices.includes(service.toString())) {
				if (!possibleTimings[busStopCode]) possibleTimings[busStopCode] = {};
				possibleTimings[busStopCode][service] = timingsCache[busStopCode][service];
			}
		}
	}

	function filter(filter) {
		for (var busStopCode of Object.keys(possibleTimings)) {
			var busStop = possibleTimings[busStopCode];
			for (var service of Object.keys(busStop)) {
				var filtered = busStop[service].filter(filter);
				possibleTimings[busStopCode][service] = filtered;

				if (filtered.length === 0) {
					delete possibleTimings[busStopCode][service];
				}
			}
			if (Object.keys(possibleTimings[busStopCode]).length === 0) {
				delete possibleTimings[busStopCode];
			}
		}
	}

	if (objectType(parsed.wheelchair) === 'String') {
		var wabFilterType = parsed.wheelchair === 'wab';
		filter(bus => bus.isWAB == wabFilterType);
	}

	if (objectType(parsed.type) === 'String') {
		var busTypeMapping = ['', 'SD', 'DD', 'BD'];

		filter(bus => busTypeMapping[bus.busType] === parsed.type);
	}

	var promises = [];
	var busStops = {};

	Object.keys(possibleTimings).forEach(busStopCode => {
		var services = Object.keys(possibleTimings[busStopCode]);
		services.forEach(service => {
			var busServiceData = exports.getServiceData(service, busStopCode, busStopCode).then(data => {
				possibleTimings[busStopCode][service] = Object.assign(possibleTimings[busStopCode][service], data);
				return true;
			});
			var busStopData = new Promise((resolve, reject) => {
				BusStop.findOne({
					busStopCode: busStopCode
				}, (err, busStop) => {
					busStops[busStopCode] = busStop;
					resolve();
				});
			});
			promises.push(Promise.all([busStopData, busServiceData]));
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
			possibleTimings
		})
	});

}
