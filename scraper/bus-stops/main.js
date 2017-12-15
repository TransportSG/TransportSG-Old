const BusStop = require('../../app/models/BusStop'),
LTADataMall = require('ltadatamall'),
{APIKey, BusStopsAPI} = LTADataMall,
config = require('../../config');

var busStopsAPI = new BusStopsAPI(new APIKey(config.ltaAPIKey));

var remainingRequests = 0;

var specialBusStops = {
    '45009': {
        busStopCode: '45009',
        roadName: 'Petir Rd',
        busStopName: 'Bukit Panjang Int',
        position: { latitude: 1.378441509, longitude: 103.7629146 },
        busServices: []
    }, '00481': {
        busStopCode: '00481',
        roadName: 'Woodlands Rd',
        busStopName: 'Bukit Panjang Temp Bus Park',
        position: { latitude: 1.383764, longitude: 103.7583 },
    }, '06049': {
        busStopCode: '06049',
        roadName: 'Outram Rd',
        busStopName: 'Bef Outram Flyover',
        position: { latitude: 1.28474856880259, longitude: 103.83517705055233 },
    }, '21461': {
        busStopCode: '21461',
        roadName: 'Jln Tukang',
        busStopName: 'Bef Tukang Innovation Dr',
        position: { latitude: 1.32731972199567, longitude: 103.71799361099863 },
        busServices: []
    }, '21481': {
        busStopCode: '21481',
        roadName: 'Jln Tukang',
        busStopName: 'Grundfos',
        position: { latitude: 1.32600145997044, longitude: 103.71208836146995 },
        busServices: []
    }, '21489': {
        busStopCode: '21489',
        roadName: 'Jln Tukang',
        busStopName: 'Opp Grundfos',
        position: { latitude: 1.32627839733404, longitude: 103.71265433258445 },
    }, '21359': {
        busStopCode: '21359',
        roadName: 'Jln Boon Lay',
        busStopName: 'Aft ST Kinetics',
        position: { latitude: 1.33867010260834, longitude: 103.7099597309989 },
    }, '24519': {
        busStopCode: '24519',
        roadName: 'Tuas Rd',
        busStopName: 'Gul Circle Stn Exit B',
        position: { latitude: 1.319071944, longitude: 103.6598081 }
    }, '24511': {
        busStopCode: '24511',
        roadName: 'Tuas Rd',
        busStopName: 'Gul Circle Stn Exit A',
        position: { latitude: 1.319446944, longitude: 103.6608911 }
    }, '25421': {
        busStopCode: '25421',
        roadName: 'Tuas West Dr',
        busStopName: 'Opp Tuas Link Stn',
        position: { latitude: 1.3414665264837, longitude: 103.63745040018382 }
    }, '96439': {
        busStopCode: '96439',
        roadName: 'Tanah Merah Coast Rd',
        busStopName: 'Changi Naval Base',
        position: { latitude: 1.318248056, longitude: 104.0155981 },
        busServices: []
    }
}

module.exports = () => {
    busStopsAPI.getAllBusStops((err, busStops) => {
        busStops.forEach(busStop => {
            if (specialBusStops[busStop.busStopCode]) return;
            BusStop.findOne({
                busStopCode: Array(5).fill('0').concat([...busStop.busStopCode.toString()]).slice(-5).join('')
            }, (err, stop) => {
                var busStopData = Object.assign(busStop, {
                    busServices: []
                });

                console.log(busStop)

                function done() {
                    remainingRequests--;
                    if (remainingRequests == 0) process.exit();
                }

                if (!stop) {
                    var data = new BusStop(busStopData);

                    data.save(done);
                } else {
                    stop.set(busStopData);
                    stop.save(done);
                }
            });
        });
    });

    Object.keys(specialBusStops).forEach(busStopCode => {
        var busStopData = specialBusStops[busStopCode];
        BusStop.findOne({
            busStopCode: busStopCode
        }, (err, busStop) => {
            busStop.set(busStopData);
            busStop.save();
        });
    });
};
