var util = require('util'),
  Sensor = require('./../Sensor'),
  I2CSensor = require('./../I2CSensor'),
  I2C = require('../../I2C')

var DistanceSensor = function() {
  I2CSensor.call(this, Sensor.TYPES.I2C)

  this._addI2CDevice(I2C.MID | I2C.SAME, I2C.US.ADDR, I2C.US.DATA_REG)
}
util.inherits(DistanceSensor, I2CSensor)

DistanceSensor.prototype._readI2CValue = function(device, value) {
  this.value = value
}

module.exports = DistanceSensor
