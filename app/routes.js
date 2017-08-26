const Index = require('./controller/Index'),
	BusTimings = require('./controller/BusTimings'),
	LocateBusStops = require('./controller/LocateBusStops'),
	Math = require('./controller/Math');

module.exports = app => {
	app.get('/', Index.index);

	app.get('/timings/:busStopCode', BusTimings.index);

	app.get('/nearby', LocateBusStops.index);
	app.post('/nearby/latlong', LocateBusStops.findByLatLong);

	app.get('/math/trigo-graphs', Math.trigoGraphs);
};
