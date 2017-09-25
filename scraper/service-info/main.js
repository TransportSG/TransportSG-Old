const request = require('request'),
    {JSDOM} = require('jsdom'),
    BusService = require('../../app/models/BusService'),
    BusStop = require('../../app/models/BusStop');

var serviceURL = 'https://www.transitlink.com.sg/eservice/eguide/service_route.php?service=';

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
    return service.endsWith('A') || service.endsWith('B');
}

var operatorMap = {
    'Tower Transit': 'Tower Transit Singapore',
    'Go-Ahead Singapore': 'Go-Ahead Singapore',
    'SMRT Buses': 'SMRT Buses',
    'SBS Transit': 'SBS Transit'
}

var remaining = 0;

function filterOutStopsForSWT(allStops, foundService) {
    var serviceNo = foundService.fullService;
    var endingStop;

    allStops = allStops.map((direction, i) => {
        var remainingTerminals = foundService.interchanges;

        direction.forEach((stop, j) => {
            if (stop.busStopCode == foundService.interchanges[i] && remainingTerminals[0] == stop.busStopCode) {
                remainingTerminals.splice(0, 1);

                endingStop = j + 1;
            }
        })
        return direction.filter((stop, i) => i < endingStop);
    }).slice(0, 1);

    return allStops;
}

function loadBusServiceData(serviceNo, callback) {
    console.log('Doing ' + serviceNo);
    request(serviceURL + serviceNo.replace(/[#C]/, '%23').replace(/[AB]/, ''), (err, resp) => {
        if (err) throw err;

            var query = {
                serviceNumber: getServiceNumber(serviceNo),
                variant: getServiceVariant(serviceNo)
            };

        BusService.findOne(query, (err, foundService) => {
            var dom = new JSDOM(resp.body),
            document = dom.window.document;
            if (!!document.querySelector('.warn')) {
                    setTimeout(callback, 1);
                    return;
            }
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
                    var result = {};
                    var multiplier = finalTimingsList.length / 4;

                    function get(base, i, j) {
                        var c = finalTimingsList[base * multiplier + i][j] || finalTimingsList[base * multiplier + i][0];
                        if (c === '-') return 0;
                        return c || 0;
                    }

                    for (var i = 0; i < multiplier; i++) {
                        result[i + 1] = {
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
                    var allStops = stopsList.map(stopsList => {
                        var stops = Array.from(stopsList.querySelectorAll('tr'));
                        return stops.slice(1).filter(stop => !stop.querySelector('.subhead2')).slice(1, -1).map(busStop => {
                            var nodes = busStop.children;
                            return {
                                busStopCode: nodes[1].textContent.trim(),
                                busStopName: nodes[2].textContent.slice(3),
                                busStopDistance: nodes[0].textContent * 1
                            };
                        });
                    });
                    if (isASWT(serviceNo)) {
                        allStops = filterOutStopsForSWT(allStops, foundService)
                    }
                    return allStops.reduce((a, b, i) => {a[i + 1] = b; return a}, {});;
                })()
            };
            var service = new BusService(contents);
            remaining++;


            Object.keys(contents.stops).forEach(d => {
                var direction = contents.stops[d];
                direction.forEach((busStop, i) => {
                    if (busStop.busStopCode === '') return;
                    BusStop.findOne({
                        busStopCode: busStop.busStopCode
                    }, (err, foundBusStop) => {
                        if (!foundBusStop) {
                            console.log(busStop);
                        }
                        if (foundBusStop.busServices.filter(e => e.fullService === serviceNo).length) return;

                        foundBusStop.busServices.push({
                            serviceNumber: getServiceNumber(serviceNo),
                            variant: getServiceVariant(serviceNo),
                            fullService: serviceNo,
                            operator: foundService.operator,
                            busStopDistance: busStop.busStopDistance,
                            busStopNumber: i + 1,
                            direction: d,
                        });

                        foundBusStop.busServices.sort((a, b) => a.serviceNumber - b.serviceNumber);

                        foundBusStop.markModified('busServices');

                        remaining++;
                        foundBusStop.save(() => {
                            remaining--;
                        });
                    });
                });
            });

            BusService.findOneAndUpdate(query, contents, err => {
                if (err) console.log(err);
                remaining--;
                setTimeout(callback, 100);
            });
        });
    });
}

module.exports = () => {
    BusService.find().distinct('fullService', (err, allServices) => {
        function nSWT(svc) {return !isASWT(svc);}
        function iSWT(svc) {return isASWT(svc);}

        var x = [].concat(allServices).sort((a, b) => getServiceNumber(a) - getServiceNumber(b))
            .filter(serviceNo => !(serviceNo.startsWith('N') || serviceNo.endsWith('N') || serviceNo.startsWith('BPS') ||
             serviceNo.startsWith('CT') || serviceNo.endsWith('G') || serviceNo.endsWith('W') || serviceNo === '268C'));
        var y = [].concat(y);

        function loopN() {
            var n = x.splice(0, 1)[0];
            if (n) {
                if (nSWT(n))
                    loadBusServiceData(n, loopN);
                else
                    setTimeout(loopN, 1);
            }
        }

        function loopI() {
            var n = y.splice(0, 1)[0];
            if (n) {
                if (iSWT(n))
                    loadBusServiceData(n, loopI);
                else
                    setTimeout(loopI, 1);
            }
        }

        // loopN();
        loopI();
    });
}
