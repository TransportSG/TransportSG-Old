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

exports.index = (req, res) => {
	var busStopCode = req.params.busStopCode;
	busTimingsAPI.getBusTimingsForStop(busStopCode, (err, timings) => {
		BusStop.findOne({
			busStopCode: busStopCode
		}, (err, busStop) => {
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
					busStopCode: busStopCode,
					busStop
				});
			});
		});
	});
};
