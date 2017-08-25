const BusStop = require('../../app/models/BusStop'),
    LTADataMall = require('ltadatamall'),
    {APIKey, BusStopsAPI} = LTADataMall,
    config = require('../../config');

var busStopsAPI = new BusStopsAPI(new APIKey(config.ltaAPIKey));

var remainingRequests = 0;

module.exports = () => {
    busStopsAPI.getAllBusStops((err, busStops) => {
        busStops.forEach(busStop => {
            BusStop.findOne({
                busStopCode: Array(5).fill('0').concat([...busStop.busStopCode.toString()]).slice(-5).join('')
            }, (err, stop) => {
                if (!stop) {
                    var data = new BusStop(Object.assign(busStop, {
                        busServices: []
                    }));
                    data.save(() => {
                        remainingRequests--;
                    });
                }
            });
        });
    });
};
