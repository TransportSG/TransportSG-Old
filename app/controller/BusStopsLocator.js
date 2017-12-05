const BusStops = require('../models/BusStop');

exports.distanceBetween2Coords = (lat1, lon1, lat2, lon2) => {
    var p = 0.017453292519943295;
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 +
    c(lat1 * p) * c(lat2 * p) *
    (1 - c((lon2 - lon1) * p))/2;

    return 12742 * Math.asin(Math.sqrt(a));
}

exports.locateBusStops = (lat, long, distance, callback) => {
        var query = {
            'position.latitude': {
                '$lt': lat + distance,
                '$gt': lat - distance
            },
            'position.longitude': {
                '$lt': long + distance,
                '$gt': long - distance
            }
        };

        BusStops.find(query, (err, busStops) => {
            busStops = busStops.map(busStop => {
                return {
                    busStopCode: busStop.busStopCode,
                    roadName: busStop.roadName,
                    busStopName: busStop.busStopName,
                    busServices: busStop.busServices,
                    distance: exports.distanceBetween2Coords(busStop.position.latitude, busStop.position.longitude, lat, long)
                };
            }).sort((a, b) => a.distance - b.distance);
            callback(busStops);
        });
}
