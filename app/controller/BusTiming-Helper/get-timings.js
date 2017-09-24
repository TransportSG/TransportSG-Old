const request = require('request');
const vars = require('./support');

const c = vars.chars;

var timingsURL = 'https://s3-ap-southeast-1.amazonaws.com/lta-eta-web-2/bus_arrival.baf3.js';

module.exports = callback => {
    request(timingsURL, (err, resp, body) => {
        var timings = {};

        function parseDate(timing) {
            return new Date('20' + c[timing[0]] + ' ' + c[timing[1]] + ' ' + c[timing[2]] + ' ' + c[timing[3]] + ':' + c[timing[4]] + ':' + c[timing[5]]);
        }

        function etaCallback(args) {
            var data = args[1];
            var busStops = data.split('$');
            busStops.forEach(busStop => {
                var busStopCode = busStop.split('|')[0];

                timings[busStopCode] = {};

                var timingsForServices = busStop.split('|')[1];
                var services = timingsForServices.split(';');
                services.forEach(service => {
                    var serviceData = service.split(':');
                    var serviceNo = serviceData[0],
                        timingData = serviceData[1],
                        destination = serviceData[2];

                    timings[busStopCode][serviceNo] = timingData.match(/(.{10})/g).map(timing => {
                        timing = [...timing];
                        return {
                            arrivalTime: parseDate(timing),
                            isWAB: !!timing[6],
                            load: timing[7],
                            busType: timing[8]
                        }
                    }).filter(timing => timing.load !== '-');
                });
            });
            callback(timings);
        }

        eval(body);
    });
}
