const getTimings = require('./BusTiming-Helper/get-timings'),
BusStop = require('../models/BusStop'),
BusService = require('../models/BusService');

const BusDepotData = require('./support.json');

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
	return corrected = timings.map(bus => {
		if (bus.busType <= 2 && operator != 'SBS Transit') {
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

exports.getServiceData = (busService, givenDestination, currentStop) => {
	return new Promise(function(resolve, reject) {
		BusService.findOne({
			fullService: busService.replace(/[WG]/g, '')
		}, (err, service) => {
			if (!service) {
				var parent = busService.replace(/[ABC#]/g, '');
				getServiceData(parent, givenDestination, busStopCode).then(data => {
					data.serviceVariant = getServiceVariant(busService);
					resolve(data);
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
				timings[service] = Object.assign(correctBuses(timings[service], data.operator), data);
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

	var query = req.body.query + ' ';

	var tokens = [];
	var lastToken = '';
	var state = 0;

	[...query].forEach((char, i) => {
		if (char === '(' && state === 0) {
			state = 1;
		}
		if (char === ')' && state === 1) {
			state = 0;
		}

		if (char === ' ' && state === 0) {
			tokens.push(lastToken);
			lastToken = '';
		} else {
			lastToken += char;
		}
	});

	var svcEncountered = false;

	tokens = tokens.map(token => {
		var functionName = '';
		var args = '';

		var state = 0;

		[...token].forEach((char, i) => {
			if (char === '(') state = 1;

			if (state === 0) {
				functionName += char;
			}
			if (state === 1) {
				if (char !== '(' && char !== ')') {
					args += char;
				}
			}
		});

		if (functionName === 'svc' || functionName === 'depot') svcEncountered = true;

		return {
			functionName, args
		}
	});

	var possibleTimings = {};

	// if (!svcEncountered) possibleTimings = timingsCache;

	function filterBySvc(service) {
		Object.keys(timingsCache).forEach(busStopCode => {
			if (service in timingsCache[busStopCode]) {
				if (possibleTimings[busStopCode])
					possibleTimings[busStopCode][service] = timingsCache[busStopCode][service];
				else {
					possibleTimings[busStopCode] = {};
					possibleTimings[busStopCode][service] = timingsCache[busStopCode][service];
				}
			}
		})
	}

	tokens.forEach(token => {
		if (token.functionName === 'svc') {
			filterBySvc(token.args);
		}

		if (token.functionName === 'depot') {
			if (token.args in BusDepotData) {
				BusDepotData[token.args].forEach(svc => {
					filterBySvc(svc);
				});
			}
		}

		if (token.functionName === 'nwab') {
			token.args = Boolean(token.args);
			Object.keys(possibleTimings).forEach(busStopCode => {
				var busStop = possibleTimings[busStopCode];
				Object.keys(busStop).forEach(serviceNumber => {
					var service = busStop[serviceNumber];
					var validBuses = service.filter(bus => {
						return bus.isWAB !== token.args;
					});
					if (validBuses.length > 0)
						possibleTimings[busStopCode][serviceNumber] = validBuses;
					else delete possibleTimings[busStopCode][serviceNumber];
				});
				if (Object.keys(busStop).length === 0) delete possibleTimings[busStopCode];
			});
		}

		if (token.functionName === 'type') {
			var typeMap = ['', 'SD', 'DD', 'BD'];
			Object.keys(possibleTimings).forEach(busStopCode => {
				var busStop = possibleTimings[busStopCode];
				Object.keys(busStop).forEach(serviceNumber => {
					var service = busStop[serviceNumber];
					var validBuses = service.filter(bus => {
						return typeMap[bus.busType] === token.args
					});
					if (validBuses.length > 0)
						possibleTimings[busStopCode][serviceNumber] = validBuses;
					else delete possibleTimings[busStopCode][serviceNumber];
				});
				if (Object.keys(busStop).length === 0) delete possibleTimings[busStopCode];
			});
		}
	});

	var busStops = {};
	var promises = [];

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
