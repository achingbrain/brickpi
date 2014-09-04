var util = require('util'),
  Sensor = require('./Sensor'),
  Utils = require('./Utils')

var ColourSensor = function() {
  Sensor.call(this, Sensor.TYPES.COLOUR)
}
util.inherits(ColourSensor, Sensor)

ColourSensor.prototype._decodeValue = function(message, startLocation) {
  this.value = Utils.decodeInt(3, message, startLocation)

  return startLocation + 3
}

module.exports = ColourSensor
