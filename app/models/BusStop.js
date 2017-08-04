const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BusStop = new Schema({
    busStopCode: Number,
    name: String,
    position: {
        latitude: Number,
        longitude: Number
    },
    roadName: String
});
