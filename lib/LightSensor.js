var util = require('util'),
  Sensor = require('./Sensor'),
  Utils = require('./Utils')

var LightSensor = function() {
  Sensor.call(this, Sensor.TYPES.LIGHT)
}
util.inherits(LightSensor, Sensor)

LightSensor.prototype.decodeValues = function(message, startLocation) {
  this.value = Utils.decodeInt(10, message, startLocation);

  return startLocation + 10;
}

module.exports = LightSensor
