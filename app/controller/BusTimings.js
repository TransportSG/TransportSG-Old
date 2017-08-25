const {BusTimingsAPI} = require('ltadatamall'),
	BusStop = require('../models/BusStop'),
	BusService = require('../models/BusService'),
	util = require('../util'),
	CachedMap = require('../CachedMap');

const busTimingsAPI = new BusTimingsAPI(global.apiKey),
	busTimingsCache = new CachedMap(30 * 1000);

var cssMap = {
	'SBS Transit': 'sbst',
	'SMRT Buses': 'smrt',
	'Tower Transit Singapore': 'tts',
	'Go-Ahead Singapore': 'gas'
}

function isValidBusStopCode(busStopCode) {
	return !!busStopCode.match(/^\d{5}$/);
}

function createOffset(timings, ageMillis) {
	timings.service = timings.service.map(service => {
		service.buses = service.buses.map(bus => {
			var diff = new Date(bus.arrivalTime - new Date() - ageMillis);
			bus.timeToArrival = {
				minutes: diff.getUTCMinutes(),
				seconds: diff.getUTCSeconds()
			}
			return bus;
		});
		return service;
	});
	return timings;
}

function getTerminalForService(busService, givenDestination) {
	return new Promise(function(resolve, reject) {
		BusService.findOne({
			fullService: busService.replace(/[WG]/g, '')
		}, (err, service) => {
			if (service.interchanges.indexOf(givenDestination) !== -1) {
				BusStop.findOne({
					busStopCode: service.interchanges[service.interchanges.indexOf(givenDestination)]
				}, (err, terminus) => {
					resolve(terminus);
				})
				return;
			}
			Object.keys(service.stops).slice(0, -1).forEach(d => {
				var direction = service.stops[d];
				direction.forEach((busStop, i) => {
					if (busStop.busStopCode == givenDestination) {
						resolve(direction[direction.length - 1]);
						return;
					}
				});
			});
		});
	});
}

function filterFakeNWAB(timings, operator) {
	return timings.map(bus => {
		if (bus.type === 'DD' && operator != 'SBS Transit') {
			bus.isWAB = true;
		}
		if (bus.type === 'SD' && operator != 'SBS Transit') {
			bus.isWAB = true;
		}
		return bus;
	});
}

function respondTimings(res, timings, busStop) {
	var busStopCode = busStop.busStopCode;
	util.asyncMap(timings.service.filter(service => service.buses.length > 0),
		service => getTerminalForService(service.serviceNumber + service.serviceVariant, service.buses[0].serviceData.end),
		(busStop, service) => {
			return {
				serviceNumber: service.serviceNumber,
				serviceVariant: service.serviceVariant,
				operatorCssName: cssMap[service.operator],
				routeDestination: busStop,
				timings: filterFakeNWAB(service.buses, service.operator)
			};
		}, services => {
			res.render('bus/timings/stop', {
				timings: {
					services: services.sort((a, b) => a.serviceNumber - b.serviceNumber)
				},
				busStopCode: Array(5).fill(0).concat((busStopCode).toString().split('')).slice(-5).join(''),
				busStopName: busStop.busStopName
			});
		}
	);
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
		var {value, age} = busTimingsCache.get(busStopCode);
		if (value) {
			value = createOffset(value, age);
			respondTimings(res, value, busStop);
		} else {
			busTimingsAPI.getBusTimingsForStop(busStopCode, (err, timings) => {
				busTimingsCache.put(busStopCode, timings);
				respondTimings(res, timings, busStop);
			});
		}
	});
};
