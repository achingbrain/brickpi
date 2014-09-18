var util = require('util'),
  Sensor = require('../Sensor')

var ColourSensor = function() {
  Sensor.call(this, Sensor.TYPES.NXT.COLOUR)
}
util.inherits(ColourSensor, Sensor)

ColourSensor.prototype._decodeValue = function(message) {
  this.value = message.getBits(1, 0, 3)
  this.blank = message.getBits(1, 0, 10)
  this.r = message.getBits(1, 0, 10)
  this.g = message.getBits(1, 0, 10)
  this.b = message.getBits(1, 0, 10)
}

module.exports = ColourSensor
