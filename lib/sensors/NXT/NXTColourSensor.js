var util = require('util'),
  Sensor = require('../Sensor')

var ColourSensor = function() {
  Sensor.call(this, Sensor.TYPES.NXT.COLOUR)
}
util.inherits(ColourSensor, Sensor)

ColourSensor.prototype._decodeValue = function(message) {
  this.value = message.getBits(0, 0, 3)
}

module.exports = ColourSensor
