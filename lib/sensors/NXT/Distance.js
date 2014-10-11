var util = require('util'),
  Sensor = require('./../Sensor'),
  I2CSensor = require('./../I2CSensor'),
  I2C = require('../../I2C')

var Distance = function() {
  I2CSensor.call(this)

  this._addI2CDevice(I2C.MID | I2C.SAME, I2C.US.ADDR, I2C.US.DATA_REG)
}
util.inherits(Distance, I2CSensor)

Distance.prototype._getType = function() {
  return Sensor.TYPES.I2C
}

Distance.prototype._readI2CValue = function(device, value) {
  this._value = value
}

module.exports = Distance
