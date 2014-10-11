var util = require('util'),
  Sensor = require('../Sensor')

var Sound = function() {
  Sensor.call(this, Sensor.TYPES.NXT.RAW)
}
util.inherits(Sound, Sensor)

Sound.prototype._getType = function() {
  return Sensor.TYPES.NXT.RAW
}

Sound.prototype._decodeValue = function(message) {
  this._value = parseInt(message.getBits(1, 0, 10) / 10, 10)
}

module.exports = Sound
