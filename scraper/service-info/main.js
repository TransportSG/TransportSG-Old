const request = require('request'),
    {JSDOM} = require('jsdom'),
    BusService = require('../../app/models/BusService');

var serviceURL = 'http://www.transitlink.com.sg/eservice/eguide/service_route.php?service=';

const config = require('../../config');

function getServiceNumber(service) {
    if (service.startsWith('NR')) {
        return service.replace(/[0-9]/g, '');
    } else if (service.startsWith('CT')) {
        return 'CT';
    } else
        return service.replace(/[A-Za-z#]/g, '');
}

function getServiceVariant(service) {
    if (service.startsWith('NR')) {
        return service.replace(/[A-Za-z#]/g, '');
    } else if (service.startsWith('CT')) {
        return service.replace(/CT/, '');
    } else
    return service.replace(/[0-9]/g, '').replace(/#/, 'C');
}

function isASWT(service) {
    if (service.startsWith('NR') || service.endsWith('N') || service.startsWith('CT')) {
        return false;
    } else if (service.endsWith('A') || service.endsWith('B') || service.endsWith('C')) {
        return true;
    }
}

var operatorMap = {
    'Tower Transit': 'Tower Transit Singapore',
    'Go-Ahead Singapore': 'Go-Ahead Singapore',
    'SMRT Buses': 'SMRT Buses',
    'SBS Transit': 'SBS Transit'
}

var remaining = 0;

function loadBusServiceData(serviceNo) {
    if (serviceNo.startsWith('N') || serviceNo.endsWith('N')) return;
    request(serviceURL + serviceNo.replace(/[#C]/, '%23'), (err, resp) => {
        if (err) throw err;
        var dom = new JSDOM(resp.body),
        document = dom.window.document;
        var routeHasTwoInt = !!document.querySelector('#Content-eservice > article > section > table:nth-child(1) > tbody > tr:nth-child(4) > td:nth-child(1)');
        var contents = {
            firstBus: (() => {
                var firstRow = document.querySelector('#Content-eservice > article > section > table:nth-child(1) > tbody > tr:nth-child(3)');
                var secondRow = document.querySelector('#Content-eservice > article > section > table:nth-child(1) > tbody > tr:nth-child(4)');
                function get(ti, i) {
                    var t = ti.querySelector('td:nth-child(' + i + ')').textContent;
                    if (t === '-') return 0;
                    return t.split(/\//).filter(Boolean);
                }
                return [firstRow, secondRow].filter(Boolean).map(timings => {
                    return {
                        weekdays: get(timings, 2),
                        saturday: get(timings, 4),
                        sunday: get(timings, 6)
                    }
                }).reduce((a, b, i) => {a[i + 1] = b; return a}, {});;
            })(),
            lastBus: (() => {
                var firstRow = document.querySelector('#Content-eservice > article > section > table:nth-child(1) > tbody > tr:nth-child(3)');
                var secondRow = document.querySelector('#Content-eservice > article > section > table:nth-child(1) > tbody > tr:nth-child(4)');
                function get(ti, i) {
                    var t =  ti.querySelector('td:nth-child(' + i + ')').textContent;
                    if (t === '-') return 0;
                    return t.split(/\//).filter(Boolean);
                }
                return [firstRow, secondRow].filter(Boolean).map(timings => {
                    return {
                        weekdays: get(timings, 3),
                        saturday: get(timings, 5),
                        sunday: get(timings, 7)
                    }
                }).reduce((a, b, i) => {a[i + 1] = b; return a}, {});;
            })(),
            frequency: (() => {
                var lines = document.querySelector('#Content-eservice > article > section > table:nth-child(3) > tbody > tr:nth-child(2)').textContent.split('\n').slice(2, 6);
                var rawArray = lines.map(timings => {
                    return timings.replace(/\s/g, '').split('s').slice(0, 2);
                });
                var finalTimingsList = rawArray.map(timingSet => timingSet.filter(Boolean).map(timings => {
                    return timings.replace('minute', '').split('-');
                })).reduce((result, timing) => result.concat(timing), []);
                var result = [];
                var multiplier = finalTimingsList.length / 4;

                function get(base, i, j) {
                    var c = finalTimingsList[base * multiplier + i][j] || finalTimingsList[base * multiplier + i][0];
                    if (c === '-') return 0;
                    return c || 0;
                }

                for (var i = 0; i < multiplier; i++) {
                    result[i] = {
                        morning: {
                            min: get(0, i, 0),
                            max: get(0, i, 1)
                        },
                        afternoon: {
                            min: get(1, i, 0),
                            max: get(1, i, 1)
                        },
                        evening: {
                            min: get(2, i, 0),
                            max: get(2, i, 1)
                        },
                        night: {
                            min: get(3, i, 0),
                            max: get(3, i, 1)
                        }
                    };
                };
                return result;
            })(),
            stops: (() => {
                var stopsList = Array.from(document.querySelectorAll('.eguide-table tbody')).slice(2);
                return stopsList.map(stopsList => {
                    var stops = Array.from(stopsList.querySelectorAll('tr'));
                    return stops.slice(3).filter(stop => !stop.querySelector('.subhead2')).slice(1, -1).map(busStop => {
                        var nodes = busStop.children;
                        return {
                            distance: nodes[0].textContent * 1,
                            busStopCode: nodes[1].textContent * 1,
                            busStopName: nodes[2].textContent.slice(3)
                        };
                    });
                }).reduce((a, b, i) => {a[i + 1] = b; return a}, {});
            })()
        };
        var service = new BusService(contents);
        remaining++;
        var query = {
            serviceNumber: getServiceNumber(serviceNo),
            variant: getServiceVariant(serviceNo)
        };

        BusService.findOne(query, (err, foundService) => {
            if (!foundService) service.save((err, data) => {
                if (err) console.log(err);
                remaining--;
            });
            else {
                BusService.findOneAndUpdate(query, contents, err => {
                    if (err) console.log(err);
                    remaining--;
                });
            }
        })
    });
}

module.exports = () => {
    setInterval(() => {
        console.log(`Waiting for ${remaining} more requests to finish`);
        if (remaining === 0) {
            mongoose.connection.close();
            process.exit(0);
        }
    }, 10000);

    BusService.find().distinct('fullService', (err, allServices) => {
        for (let service of allServices) {
            if (isASWT(service)) continue;
            loadBusServiceData(service);
        }
    });
}
