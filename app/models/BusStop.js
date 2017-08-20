const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BusStop = new Schema({
    busStopCode: String,
    busStopName: String,
    position: {
        latitude: Number,
        longitude: Number
    },
    roadName: String,
    busServices: [{
        service: String,
        operator: String,
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
});

module.exports = mongoose.model('BusStop', BusStop);
module.exports.schema = BusStop;
