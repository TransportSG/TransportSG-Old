const {BusTimingsAPI} = require('ltadatamall');

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
		timings = {
			services: timings.service.map(service => {
				return {
					serviceNumber: service.serviceNumber,
					serviceVariant: service.serviceVariant,
					operatorCssName: cssMap[service.operator],
					timings: service.buses
				};
			})
		}
		console.log(JSON.stringify(timings, null, 4));
		res.render('bus/timings/stop', timings);
	});
};
