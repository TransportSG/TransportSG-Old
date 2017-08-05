const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BusStop = new Schema({
    busStopCode: Number,
    busStopName: String,
    position: {
        latitude: Number,
        longitude: Number
    },
    roadName: String
});

module.exports = mongoose.model('BusStop', BusStop);
