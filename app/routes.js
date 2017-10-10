const Index = require('./controller/Index'),
	BusTimings = require('./controller/BusTimings'),
	LocateBusStops = require('./controller/LocateBusStops');

module.exports = app => {
	app.get('/', Index.index);
	app.get('/timings/search', BusTimings.timingSearch);
	app.post('/timings/search', BusTimings.performSearch);
	app.get('/timings/:busStopCode', BusTimings.index);

	app.get('/nearby', LocateBusStops.index);
	app.get('/bus/stops/nearby', LocateBusStops.index);
	app.post('/nearby/latlong', LocateBusStops.findByLatLong);

};
