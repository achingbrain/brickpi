var util = require('util'),
  Sensor = require('./Sensor'),
  Utils = require('./Utils')

var DistanceSensor = function() {
  Sensor.call(this, Sensor.TYPES.DISTANCE)
}
util.inherits(DistanceSensor, Sensor)

DistanceSensor.prototype.decodeValues = function(message, startLocation) {
  this.value = Utils.decodeInt(8, message, startLocation);

  return startLocation + 8;
}

module.exports = DistanceSensor
