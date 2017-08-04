const Index = require('./controller/Index'),
	BusTimings = require('./controller/BusTimings');

module.exports = app => {
	app.get('/', Index.index);

	app.get('/timings/:busStopCode', BusTimings.index);
};
