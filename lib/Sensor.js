
var Sensor = function(type) {
  var value = null

  Object.defineProperty(this, "value", {
    get: function() {
      return value
    },
    set: function(val) {
      value = val
    }
  })

  Object.defineProperty(this, "type", {
    get: function() {
      return type
    }
  })
}
Sensor.TYPES = {
  LIGHT: 9,
  TOUCH: 32,
  DISTANCE: 33,
  COLOUR: 36
}

/**
 * Encode the data associated with the sensor to the outgoing message. The
 * default method does nothing.
 *
 * @param message the BitSet representing the outgoing message.
 * @param startLocation the starting bit location in the message at which to
 * begin encoding
 * @return the ending location. That is the startLocation for the next
 * encoding.
 */
Sensor.prototype._encodeToSetup = function(message, startLocation) {
  return startLocation
}

/**
 * Encode the data associated with the sensor to the outgoing message. The
 * default method does nothing.
 *
 * @param message the BitSet representing the outgoing message.
 * @param startLocation the starting bit location in the message at which to
 * begin encoding
 * @return the ending location. That is the startLocation for the next
 * encoding.
 */
Sensor.prototype._encodeToValueRequest = function(message, startLocation) {
  return startLocation
}

/**
 * Decode the data associated with the sensor from the incoming message.
 *
 * @param message the BitSet representing the outgoing message.
 * @param startLocation the starting bit location in the message at which to
 * begin decoding
 * @return the ending location. That is the startLocation for the next
 * encoding.
 */
Sensor.prototype._decodeValue = function(message, startLocation) {

}

module.exports = Sensor
