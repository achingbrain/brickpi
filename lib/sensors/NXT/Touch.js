var util = require('util'),
  Sensor = require('../Sensor')

var Touch = function() {
  Sensor.call(this)
}
util.inherits(Touch, Sensor)

Touch.prototype._getType = function() {
  return Sensor.TYPES.NXT.TOUCH.RAW
}

Touch.prototype._decodeValue = function(message) {
  this.value = message.getBits(1, 0, 1) ? true : false
}

module.exports = Touch
