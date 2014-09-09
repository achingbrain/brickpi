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
  // here, I think, is how this bit-encoding works.
  // the value is encoded LSb first into the array
  // so, given the 4-bit value 3
  // the array would be 1100
  // that's sort of the same as saying that the value is bit-reversed
  // could be wrong here, writing the documentation before running it...
  // first the motor-enable
  message.set(startLocation++, this._enabled)

  // direction
  if (this._requestedSpeed > 0) {  // could be reversed
    message.set(startLocation++)
  } else {
    message.clear(startLocation++)
  }

  // speed
  var tmpSpeed = this._requestedSpeed;
  for (var counter = 0; counter < 8; counter++) {
    message.set(startLocation++, (tmpSpeed & 0x1) == 1)
    tmpSpeed >>= 1
  }

  return startLocation; // nothing to encode.
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

      console.info(" Motor Speed", readingDifference, timeDifference)

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
}

module.exports = Motor
