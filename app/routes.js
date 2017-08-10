const Index = require('./controller/Index'),
	BusTimings = require('./controller/BusTimings'),
	LocateBusStops = require('./controller/LocateBusStops');

module.exports = app => {
	app.get('/', Index.index);

	app.get('/timings/:busStopCode', BusTimings.index);

	app.get('/bus/stops/nearby', LocateBusStops.index);
	app.post('/bus/stops/findByLatLong', LocateBusStops.findByLatLong);
};
