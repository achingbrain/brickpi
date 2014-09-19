var util = require('util'),
  Sensor = require('../Sensor')

var Light = function() {
  Sensor.call(this)

  this._light
}
util.inherits(Light, Sensor)

Light.prototype._getType = function() {
  return this._light ? Sensor.TYPES.NXT.LIGHT.ON : Sensor.TYPES.NXT.LIGHT.OFF
}

Light.prototype._decodeValue = function(message) {
  this.value = parseInt((1000 - message.getBits(1, 0, 10)) / 10, 10)
}

Light.prototype.light = function(on) {
  this._light = on ? true : false

  this.emit('changed')
}

module.exports = Light
