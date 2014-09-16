var util = require('util'),
  Sensor = require('./Sensor'),
  I2C = require('../I2C')

var I2CSensor = function(type) {
  Sensor.call(this, type)

  this._i2cDevices = []

  this._addI2CDevice(I2C.MID | I2C.SAME, I2C.US.ADDR, I2C.US.DATA_REG)
}
util.inherits(I2CSensor, Sensor)

I2CSensor.prototype._getI2CSpeed = function() {
  return I2C.US.SPEED
}

I2CSensor.prototype._addI2CDevice = function(settings, address, reg) {
  if(this._i2cDevices.length == 8) {
    throw new Error('I2C bus only supports up to 8 devices!')
  }

  this._i2cDevices = [{
    settings: settings,
    address: address,
    write: 1,
    read: 1,
    out: [reg]
  }]
}

I2CSensor.prototype._encodeToSetup = function(message) {
  message.addBits(0, 0, 8, this._getI2CSpeed())
  message.addBits(0, 0, 3, this._i2cDevices.length - 1)

  this._i2cDevices.forEach(function(device) {
    message.addBits(0, 0, 7, device.address >> 1)
    message.addBits(0, 0, 2, device.settings)

    if(device.settings & I2C.SAME) {
      message.addBits(0, 0, 4, device.write)
      message.addBits(0, 0, 4, device.read)

      device.out.forEach(function(byte) {
        message.addBits(0, 0, 8, byte)
      })
    }
  })
}

module.exports = I2CSensor
