const BusStopsLocator = require('./BusStopsLocator');

var cssMap = {
	'SBS Transit': 'sbst',
	'SMRT Buses': 'smrt',
	'Tower Transit Singapore': 'tts',
	'Go-Ahead Singapore': 'gas'
}

exports.index = (req, res) => {
    res.render('bus/stops/nearby');
}

var oneKm = 0.00660;

exports.findByLatLong = (req, res) => {
    if (!'lat' in req.body || !'long' in req.body) {
        res.status(400).json({
            error: 'Invalid Parameters'
        });
        return;
    }

    BusStopsLocator.locateBusStops(req.body.lat, req.body.long, oneKm, busStops => {
        res.render('bus/stops/nearby-load', {
            busStops: busStops.map(busStop => {
				busStop.busServices = busStop.busServices.slice(0, 10).map(service => {
					service.operatorCss = cssMap[service.operator];
					return service;
				}).sort((a, b) => a.svc - b.svc);
				return busStop;
			}),
            getDistanceCssClass: distance => {
                if (distance >= 0 && distance < 0.3) return 'nearby';
                if (distance >= 0.3 && distance < 0.6) return 'close';
                else return 'far';
            }
        });
    });
}
