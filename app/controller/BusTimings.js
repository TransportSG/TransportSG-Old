const {BusTimingsAPI} = require('ltadatamall'),
	BusStop = require('../models/BusStop'),
	util = require('../util'),
	CachedMap = require('../CachedMap');

const busTimingsAPI = new BusTimingsAPI(global.apiKey),
	busTimingsCache = new CachedMap(10 * 1000);

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

function respondTimings(res, timings, busStop) {
	var busStopCode = busStop.busStopCode;
	util.asyncMap(timings.service, service => BusStop.findOne({
		busStopCode: service.buses[0].serviceData.end
	}).exec(),
	(busStop, service) => {
		return {
			serviceNumber: service.serviceNumber,
			serviceVariant: service.serviceVariant,
			operatorCssName: cssMap[service.operator],
			routeDestination: busStop.busStopName,
			timings: service.buses
		};
	}, services => {
		res.render('bus/timings/stop', {
			timings: {services},
			busStopCode: Array(5).fill(0).concat((busStopCode).toString().split('')).slice(-5).join(''),
			busStopName: busStop.busStopName
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
