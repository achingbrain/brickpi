var util = require('util'),
  Sensor = require('../Sensor')

var TouchSensor = function() {
  Sensor.call(this, Sensor.TYPES.NXT.TOUCH.RAW)
}
util.inherits(TouchSensor, Sensor)

TouchSensor.prototype._decodeValue = function(message, startLocation) {
  this.value = message.getBits(0, 0, 1)
}

module.exports = TouchSensor
