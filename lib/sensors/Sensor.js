var Mask = require('../Mask')

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
  I2C: 41,
  I2C_9V: 42,

  NXT: {
    TOUCH: {
      RAW: 32,
      DEBOUNCED: 69
    },
    ULTRASONIC: {
      CONT: 33,
      SS: 34
    },
    LIGHT: {
      ON: (Mask.D0_M | Mask.D0_S),
      OFF: 0
    },
    COLOR: {
      FULL: 36,
      RED: 37,
      GREEN: 38,
      BLUE: 39,
      NONE: 40
    }
  },

  RCX: {
    // tested minimally
    LIGHT: 35
  },

  // Mode information for EV3 is here: https://github.com/mindboards/ev3dev/wiki/LEGO-EV3-Ultrasonic-Sensor-%2845504%29
  EV3: {
  // Continuous measurement, distance, cm
    US: {
      M0: 43,
      //Continuous measurement, distance, in
      M1: 44,
      // Listen // 0 r 1 depending on presence of another US sensor.
      M2: 45,
      M3: 46,
      M4: 47,
      M5: 48,
      M6: 49
    },
    COLOUR: {
      // Reflected
      M0: 50,
      // Ambient
      M1: 51,
      // Color  // Min is 0, max is 7 (brown)
      M2: 52,
      // Raw reflected
      M3: 53,
      // Raw Color Components
      M4: 54,

      // Calibration???  Not currently implemented.
      M5: 55
    },
    GYRO: {
      // Angle
      M0: 56,

      // Rotational Speed
      M1: 57,

      // Raw sensor value ???
      M2: 58,

      // Angle and Rotational Speed?
      M3: 59,
      // Calibration ???
      M4: 60
    },

    // Mode information is here:  https://github.com/mindboards/ev3dev/wiki/LEGO-EV3-Infrared-Sensor-%2845509%29
    INFRARED: {
      // Proximity, 0 to 100
      M0: 61,
        // IR Seek, -25 (far left) to 25 (far right)
        M1: 62,

        // IR Remote Control, 0 - 11
        M2: 63,
        M3: 64,
        M4: 65,
      M5: 66
    },
    TOUCH: {
      RAW: 67,

        // EV3 Touch sensor, debounced.
        DEBOUNCE: 68
    }
  }
}

/**
 * Encode the data associated with the sensor to the outgoing message. The
 * default method does nothing.
 *
 * @param message the BitArray representing the outgoing message.
 */
Sensor.prototype._encodeToSetup = function(message) {

}

/**
 * Encode the data associated with the sensor to the outgoing message. The
 * default method does nothing.
 *
 * @param message the BitArray representing the outgoing message.
 */
Sensor.prototype._encodeToValueRequest = function(message) {

}

/**
 * Decode the data associated with the sensor from the incoming message.
 *
 * @param message the BitArray representing the outgoing message.
 */
Sensor.prototype._decodeValue = function(message) {

}

module.exports = Sensor
