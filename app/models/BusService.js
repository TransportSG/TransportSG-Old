const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    BusStop = require('./BusStop');

var BusService = new Schema({
    serviceNumber: String,
    variant: String,
    fullService: String,
    routeType: String,
    operator: String,
    interchanges: [],
    frequency: {
        morning: {
            min: Number,
            max: Number
        }, afternoon: {
            min: Number,
            max: Number
        }, evening: {
            min: Number,
            max: Number
        }, night: {
            min: Number,
            max: Number
        }
    },
    stops: {
        1: [{
            busStopCode: String,
            busStopName: String,
            position: {
                latitude: Number,
                longitude: Number
            },
            roadName: String,
            busStopDistance: Number,
            busStopNumber: Number,
            direction: Number,
            firstBus: {
                weekdays: Number,
                saturday: Number,
                sunday: Number
            }, lastBus: {
                weekdays: Number,
                saturday: Number,
                sunday: Number
            },
            _id: false
        }], 2: [{
            busStopCode: String,
            busStopName: String,
            position: {
                latitude: Number,
                longitude: Number
            },
            roadName: String,
            busStopDistance: Number,
            busStopNumber: Number,
            direction: Number,
            firstBus: {
                weekdays: Number,
                saturday: Number,
                sunday: Number
            }, lastBus: {
                weekdays: Number,
                saturday: Number,
                sunday: Number
            },
            _id: false
        }]
    },
    loopPoint: String
});

module.exports = mongoose.model('BusService', BusService);
module.exports.schema = BusService;
