var util = require('util'),
  EventEmitter = require('events').EventEmitter

var Motor = function() {
  EventEmitter.call(this)

  this.ticksPerRevolution = 720

  this._requestedSpeed = 0
  this._actualSpeed = 0
  this._enabled = false

  // encoder values
  this._encoderOffset = null
  this._currentEncoderValue = 0
  this._lastReadingTime = null
}
util.inherits(Motor, EventEmitter)

Motor.prototype.setBrickPi = function(brickPi) {
  this._brickPi = brickPi
}

Motor.prototype.speed = function(speed) {
  if(speed !== 0) {
    this._enabled = true
  }

  this._requestedSpeed = speed
  this._brickPi.updateValues()
}

Motor.prototype.getSpeed = function() {
  return this._actualSpeed
}

Motor.prototype.stop = function() {
  this.speed(0)
}

Motor.prototype.to = function(degrees, speed) {
  if(!speed) {
    speed = 128
  }

  if(degrees > 360) {
    degrees = 360
  }

  if(degrees < -360) {
    degrees = -360
  }

  var initialValue = this._currentEncoderValue
  var finalValue = initialValue + (degrees * 2)

  this.speed(speed)

  var callback = function(error) {
    if(degrees > 0 && finalValue > this._currentEncoderValue ||
      degrees < 0 && this._currentEncoderValue < initialValue) {
      return this._brickPi.updateValues()
    }

    this.stop()

    this._brickPi.removeListener('readSensorData', callback)
  }.bind(this)

  this._brickPi.on('readSensorData', callback)
  this._brickPi.updateValues()
}

Motor.prototype._encodeSpeed = function(message) {
  console.info("Encoding requested speed", this._requestedSpeed)

  // here, I think, is how this bit-encoding works.
  // the value is encoded LSb first into the array
  // so, given the 4-bit value 3
  // the array would be 1100
  // that's sort of the same as saying that the value is bit-reversed
  // could be wrong here, writing the documentation before running it...
  // first the motor-enable

  var speed = this._requestedSpeed
  var direction = 0

  if(speed < 0) {
    direction = 1
    speed *= -1
  }

  if(speed > 255) {
    speed = 255
  }

  var value = ((((speed & 0xFF) << 2) | ((direction & 0x11) << 1) | ((this._enabled ? 1 : 0) & 0x01)) & 0x3FF)

  message.addBits(0, 0, 10, value)
}

Motor.prototype._setEncoderValue = function(value) {
  console.info('encoder value', value)

/*
 var currentTime = Date.now()
 var readingDifference = this._currentEncoderValue - value
 var timeDifference = currentTime - this._lastReadingTime
 this._lastReadingTime = currentTime

 this._actualSpeed = Math.abs(readingDifference / timeDifference / this.ticksPerRevolution * 1000 * 60)
*/

  this._currentEncoderValue = value
  this._actualSpeed = value / 2

  if(value & 0x01) {
    this._actualSpeed *= -1
  }

  console.info("Motor speed", this._actualSpeed, "requested", this._requestedSpeed)
}

module.exports = Motor
