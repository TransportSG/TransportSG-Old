const BusStops = require('../models/BusStop'),
    BusServices = require('../models/BusService');

exports.index = (req, res) => {
    res.render('bus/stops/nearby');
}

function distance(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295;
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 +
    c(lat1 * p) * c(lat2 * p) *
    (1 - c((lon2 - lon1) * p))/2;

    return 12742 * Math.asin(Math.sqrt(a));
}

var oneKm = 0.00660;

exports.findByLatLong = (req, res) => {
    if (!'lat' in req.body || !'long' in req.body) {
        res.status(400).json({
            error: 'Invalid Parameters'
        });
        return;
    }

    var query = {
        'position.latitude': {
            '$lt': req.body.lat + oneKm,
            '$gt': req.body.lat - oneKm
        },
        'position.longitude': {
            '$lt': req.body.long + oneKm,
            '$gt': req.body.long - oneKm
        }
    };

    BusStops.find(query, (err, busStops) => {
        busStops = busStops.map(busStop => {
            return {
                busStopCode: busStop.busStopCode,
                roadName: busStop.roadName,
                busStopName: busStop.busStopName,
                busServices: busStop.busServices,
                distance: distance(busStop.position.latitude, busStop.position.longitude, req.body.lat, req.body.long)
            };
        }).sort((a, b) => a.distance - b.distance);

        console.log(busStops);
        res.render('bus/stops/nearby-load', {
            busStops: busStops
        });
    });
}
