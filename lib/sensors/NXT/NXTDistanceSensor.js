var util = require('util'),
  Sensor = require('./../Sensor'),
  I2CSensor = require('./../I2CSensor')

var DistanceSensor = function() {
  I2CSensor.call(this, Sensor.TYPES.I2C)
}
util.inherits(DistanceSensor, I2CSensor)

DistanceSensor.prototype._decodeValue = function(message) {
  this.value = message.getBits(0, 0, 8)
}

module.exports = DistanceSensor
