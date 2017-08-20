const BusService = require('../../app/models/BusService'),
    BusStop = require('../../app/models/BusStop'),
    LTADataMall = require('ltadatamall'),
    {APIKey, BusRoutesAPI} = LTADataMall,
    config = require('../../config'),
    fs = require('fs');

var key = new APIKey(config.ltaAPIKey);
var busRoutesAPI = new BusRoutesAPI(key);

var remainingRequests = 0;

var requests = [];
var saveRunning = false;

function saveIter() {
    saveRunning = true;
    requests.splice(0, 1)[0].save().then(() => {
        remainingRequests--;
        console.log('saved')

        if (requests.length > 0)
            saveIter();
        else {
            saveRunning = false;
            return;
        }
    }).catch(err => {
        console.log(err)
        saveRunning = false;
    });
}

function saveDoc(doc) {
    requests.push(doc);
    if (!saveRunning) saveIter();
}

module.exports = () => {
    busRoutesAPI.getAllBusStopsForAllServices((err, busStops) => {
        fs.writeFile('./data.json', JSON.stringify(busStops, null, 2));
        Object.keys(busStops).forEach(busService => {
            console.log('loaded svc ' + busService);
            var stops = busStops[busService].stops;
            console.log(stops);
            BusService.findOne({
                fullService: busService
            }, (err, dbBusService) => {
                for (let busStop of stops) {
                    BusStop.findOne({
                        busStopCode: busStop.busStopCode
                    }, (err, dbBusStop) => {
                        if (err) {
                            console.log(err)
                            return;
                        }
                        if (!dbBusStop) console.log(busStop.busStopCode, busService)
                        if (dbBusStop.busServices.filter(service => service.service == busService).length === 0) {
                            dbBusStop.busServices.push(Object.assign(busStop, {
                                service: busService
                            }));

                            dbBusService.stops[busStop.direction].push(Object.assign(busStop, dbBusStop));

                            dbBusStop.markModified('busServices');

                            remainingRequests++;
                            console.log('doing svc ' + busService);
                            saveDoc(dbBusStop);
                        }
                    });
                }
                dbBusService.stops[1] = dbBusService.stops[1].sort((a, b) => a.busStopNumber - b.busStopNumber);
                if (dbBusService.stops[2])
                    dbBusService.stops[2] = dbBusService.stops[2].sort((a, b) => a.busStopNumber - b.busStopNumber);

                dbBusService.markModified('stops');
                saveDoc(dbBusService);
            });
        });
    });
};

setInterval(() => console.log(remainingRequests), 10000);
