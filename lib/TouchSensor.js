var util = require('util'),
  Sensor = require('./Sensor'),
  Utils = require('./Utils')

var TouchSensor = function() {
  Sensor.call(this, Sensor.TYPES.TOUCH)
}
util.inherits(TouchSensor, Sensor)

TouchSensor.prototype.decodeValues = function(message, startLocation) {
  this.value = Utils.decodeInt(1, message, startLocation) ? true : false;

  return startLocation + 1;
}

module.exports = TouchSensor
