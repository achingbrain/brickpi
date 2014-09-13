var Utils = require('./Utils')

var Motor = function() {
  this.ticksPerRevolution = 720

  this._requestedSpeed = 0
  this._actualSpeed = 0
  this._enabled = false

  // encoder values
  this._encoderOffset = null
  this._currentEncoderValue = null
  this._lastReadingTime = null
}

Motor.prototype.speed = function(speed) {
  if(speed !== 0) {
    this._enabled = true
  }

  this._requestedSpeed = speed
}

Motor.prototype.getSpeed = function() {
  return this._actualSpeed
}

Motor.prototype._encodeToValueRequest = function(message, startLocation) {
  console.info("Encoding requested speed", this._requestedSpeed)

  // here, I think, is how this bit-encoding works.
  // the value is encoded LSb first into the array
  // so, given the 4-bit value 3
  // the array would be 1100
  // that's sort of the same as saying that the value is bit-reversed
  // could be wrong here, writing the documentation before running it...
  // first the motor-enable

  var value = ((((Math.abs(this._requestedSpeed) & 0xFF) << 2) | (((this._requestedSpeed > 0 ? 1 : 0) & 0x11) << 1) | (this._enabled & 0x01)) & 0x3FF)
  
  console.info('outgoing value', value.toString(2), 'start location', startLocation)
  
  for(var counter = 0; counter < 10; counter++) {
    message.set(startLocation, (value & 0x1) == 1)
    value >>= 1
    startLocation++
  }
  
/*  message.set(startLocation, this._enabled ? 1 : 0)

  // direction
  if (this._requestedSpeed > 0) {  // could be reversed
    message.set(startLocation++, 1)
  } else {
    message.set(startLocation++, 0)
  }

  // speed
  var tmpSpeed = Math.abs(this._requestedSpeed);

  for(var counter = 0; counter < 8; counter++) {
    message.set(startLocation++, (tmpSpeed & 0x1) == 1)
    tmpSpeed >>= 1
  }*/

  return startLocation
}

Motor.prototype._readEncoderValue = function(incoming, startLocation) {
    var value = Utils.decodeInt(5, incoming, startLocation)
    console.info('encoder value', value)

    this._actualSpeed = value / 2

    if(value & 0x01) {
        this._actualSpeed *= -1
    }

    console.info("Motor speed", this._actualSpeed, "requested", this._requestedSpeed)
}

/**
 * Decode the encoder data associated with the motor from the incoming
 * message. This will set the currentSpeed variable.
 *
 * @param wordLength the number of bits to read
 * @param message the BitSet representing the outgoing message.
 * @param startLocation the starting bit location in the message at which to
 * begin decoding
 */
Motor.prototype._decodeValue = function(wordLength, message, startLocation) {
  var currentTime = Date.now()
  var tmpEncoderValue = Utils.decodeInt(wordLength, message, startLocation);

  // if the encoder was reset before there was an encoder value, then this next clause
  // kicks in as soon as we have a value.
  if(this._encoderOffset === null) {
    this._encoderOffset = tmpEncoderValue;
  }

  if(this._enabled) { // don't calculate the speed if we're not enabled...
    if(this._currentEncoderValue !== null) {
      var readingDifference = this._currentEncoderValue - tmpEncoderValue
      var timeDifference = currentTime - this._lastReadingTime

      //console.info("Motor Speed", readingDifference, timeDifference)

      this._actualSpeed = Math.abs(readingDifference / timeDifference / this.ticksPerRevolution * 1000 * 60)
//            // could run a little low-pass filtering here, but it needs to be corrected
//            // for direction changes, etc.  - Just set currentEncoderValue and currentSpeed when speed or direction are set
//            if (currentSpeed == Double.MAX_VALUE) {
//                currentSpeed = immediateSpeed;
//            } else {
//                currentSpeed = Math.abs((currentSpeed * 4 + immediateSpeed) / 5);
//            }
    }
  } else {
    this._actualSpeed = 0;
  }

  this._lastReadingTime = currentTime
  this._currentEncoderValue = tmpEncoderValue
  
  console.info("Motor speed", this._actualSpeed, "requested", this._requestedSpeed)
}

module.exports = Motor
