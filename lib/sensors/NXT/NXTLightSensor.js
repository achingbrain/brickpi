var util = require('util'),
  Sensor = require('../Sensor')

var LightSensor = function() {
  Sensor.call(this, Sensor.TYPES.NXT.LIGHT.ON)
}
util.inherits(LightSensor, Sensor)

LightSensor.prototype._decodeValue = function(message) {
  this.value = message.getBits(0, 0, 10)
}

module.exports = LightSensor
