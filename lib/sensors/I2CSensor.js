var util = require('util'),
  Sensor = require('./Sensor'),
  I2C = require('../I2C')

var I2CSensor = function(type) {
  Sensor.call(this, type)

  this._i2cDevices = []
}
util.inherits(I2CSensor, Sensor)

I2CSensor.prototype._getI2CSpeed = function() {
  return I2C.US.SPEED
}

I2CSensor.prototype._addI2CDevice = function(settings, address, reg) {
  if(this._i2cDevices.length == 8) {
    throw new Error('I2C bus only supports up to 8 devices!')
  }

  var device = {
    settings: settings,
    address: address,
    write: 1,

    // how many bytes we expect to read from the device
    read: 1,
    out: [reg]
  }

  this._i2cDevices.push(device)

  return device
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

I2CSensor.prototype._decodeValue = function(message) {
  var value = message.getBits(1, 0, this._i2cDevices.length)

  this._i2cDevices.forEach(function(device, index) {
    if(value & ( 0x01 << index)) {
      this._readI2CValue(device, message.getBits(1, 0, device.read * 8))
    }
  }.bind(this))
}

I2CSensor.prototype._readI2CValue = function(device, value) {

}

module.exports = I2CSensor
