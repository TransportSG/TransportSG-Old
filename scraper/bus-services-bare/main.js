const BusService = require('../../app/models/BusService'),
    LTADataMall = require('ltadatamall'),
    {APIKey, BusServicesAPI} = LTADataMall,
    config = require('../../config');

var busServicesAPI = new BusServicesAPI(new APIKey(config.ltaAPIKey));

var remainingRequests = 0;

module.exports = () => {
    busServicesAPI.getDetailsForAllBusServices((err, busServices) => {
        Object.keys(busServices).forEach(k => {
            var busService = busServices[k];
            BusService.findOne({
                fullService: busService.fullService
            }, (err, svc) => {
                if (!svc) {
                    remainingRequests++;
                    var bus = new BusService(Object.assign(busService), {
                        stops: (() => {
                            var x = {1: []};
                            if (busService.direction == 2) {
                                x[2] = {};
                            }
                            return x;
                        })()
                    });
                    bus.save(err => {
                        remainingRequests--;
                    });
                }
            });
        });
    });
};
