const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BusService = new Schema({
    serviceNumber: String,
    variant: String,
    routeType: String,
    operator: String,
    interchanges: [],
    firstBus: [{
            weekdays: [Number],
            saturday: [Number],
            sunday: [Number]
    }], lastBus: [{
            weekdays: [Number],
            saturday: [Number],
            sunday: [Number]
    }], frequency: [
        {
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
        }
    ],
    stops: [
        [
            {
                distance: Number,
                busStopCode: Number,
                name: String
            }
        ]
    ]
});

module.exports = mongoose.model('BusService', BusService)
