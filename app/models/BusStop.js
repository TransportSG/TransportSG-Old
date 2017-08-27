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
        serviceNumber: String,
        variant: String,
        fullService: String,
        operator: String,
        busStopDistance: Number,
        busStopNumber: Number,
        direction: Number,
        _id: false
    }]
});

module.exports = mongoose.model('BusStop', BusStop);
module.exports.schema = BusStop;
