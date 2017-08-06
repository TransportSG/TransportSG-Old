const {BusTimingsAPI} = require('ltadatamall'),
BusStop = require('../models/BusStop'),
util = require('../util');

const busTimingsAPI = new BusTimingsAPI(global.apiKey);

var cssMap = {
	'SBS Transit': 'sbst',
	'SMRT Buses': 'smrt',
	'Tower Transit Singapore': 'tts',
	'Go-Ahead Singapore': 'gas'
}

function isValidBusStopCode(busStopCode) {
	return !!busStopCode.match(/^\d{5}$/);
}

exports.index = (req, res) => {
	var busStopCode = req.params.busStopCode;
	if (!isValidBusStopCode) {
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
		busTimingsAPI.getBusTimingsForStop(busStopCode, (err, timings) => {
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
		});
	});
};
