var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  SerialPort = require('serialport').SerialPort,
  async = require('async'),
  LED = require('./LED'),
  PROTOCOL = require('./Protocol'),
  Utils = require('./Utils'),
  BitSet = require('./BitSet')

var BrickPi = function(port, options, callback) {
  EventEmitter.call(this)

  if(options instanceof Function) {
    callback = options
    options = {
      baudrate: 500000
    }
  }

  this._setUpLEDs([18, 27])

  this._sensors = []
  this._motors = []

  this._reading = null
  this._readLength = null
  this._readChecksum = null
  this._readBuffer = null
  this._readBufferOffset = null
  this._readTimeout = null
  this._readChecksumData = null

  // how many arduino chips are on the BrickPi
  this._serialAddresses = [1, 2]

  this._serialPort = new SerialPort(port, options)
  this._serialPort.on('open', function() {
    // start polling the BrickPi for sensor updates
    setTimeout(this._updateValues.bind(this), 100)

    // tell the BrickPi to stop the motors if we don't communicate with it for two seconds
    this.setTimeout(2000, callback)
  }.bind(this))
  this._serialPort.on('data', this._readFromBrickPi.bind(this))

  // handle incoming communications from the BrickPi
  this.on('response', this._onData.bind(this))

  this._sensorsModified = false
}
util.inherits(BrickPi, EventEmitter)

BrickPi.prototype.led = function(index) {
  return this._leds[index]
}

BrickPi.prototype.addSensor = function(sensor, port) {
  if(!this._sensorsModified) {
    this._sensorsModified = true
    process.nextTick(this._setupSensors.bind(this))
  }

  this._sensors[port] = sensor
  
  return sensor
}

BrickPi.prototype.sensor = function(index) {
    return this._sensor[index]
}

BrickPi.prototype.addMotor = function(motor, port) {
  this._motors[port] = motor
  
  return motor
}

BrickPi.prototype.motor = function(index) {
    return this._motors[index]
}

BrickPi.prototype.setTimeout = function(timeout, callback) {
  var packet = [
    PROTOCOL.SET_TIMEOUT,
    timeout & 0xFF,
    (timeout >> 8) & 0xFF,
    (timeout >> 16) & 0xFF,
    (timeout >> 24) & 0xFF
  ];

  var tasks = []

  for (var i = 0; i < this._serialAddresses.length; i++) {
    tasks.push(this._sendToBrickPiWithRetry.bind(this, i, packet))
  }

  async.series(tasks, callback)
}

BrickPi.prototype._setUpLEDs = function(pins) {
  this._leds = []

  pins.forEach(function(pin) {
    var led = new LED(pin)
    led.off()
    this._leds.push(led)
  }.bind(this))
}

BrickPi.prototype._sendToBrickPiWithRetry = function(chipIndex, packet, callback) {
  var retries = 5
  var handler = function(error) {
    if(error && retries > 0) {
        retries--
        return this._sendToBrickPi(this._serialAddresses[chipIndex], packet, handler)
    }

    if(callback) {
      callback(error)
    }
  }.bind(this)

  this._sendToBrickPi(this._serialAddresses[chipIndex], packet, handler)
}

BrickPi.prototype._sendToBrickPi = function(destinationAddress, data, callback) {
  var packet = new Buffer(data.length + 3)

  // clear the read buffer before writing...
  this._serialPort.flush(function(error) {
    if(error) return callback(error)

    // the checksum is the sum of all the bytes in the entire packet EXCEPT the checksum
    var checksum = destinationAddress + data.length + data.reduce(function(a, b, index) {
      packet[index + 3] = b
      return a + (b & 0xFF)
    }, 0);

    packet[0] = destinationAddress
    packet[1] = checksum & 0xFF
    packet[2] = data.length & 0xFF

    this._serialPort.write(new Buffer(packet), callback)
  }.bind(this))
}

BrickPi.prototype._readFromBrickPi = function(data) {
  var offset = 0

  if(!this._reading) {
    // we are starting a new read
    // the first byte of the received packet in the checksum.
    // the second is the number of bytes in the packet.
    this._readChecksum = data[0]

    // the packet size does not include this two byte header.
    this._readLength = data[1]

    this._readChecksumData = this._readLength

    offset += 2

    this._readBuffer = new Buffer(this._readLength)
    this._readBufferOffset = 0

    this._reading = true
    this._readTimeout = setTimeout(function() {
      this.emit('error', new Error('Read timeout'))
    }.bind(this), 5000)
  }

  for(var i = offset; i < data.length; i++) {
    this._readChecksumData += data[i]
    this._readBuffer[this._readBufferOffset] = data[i]
    this._readBufferOffset++
  }

  if(this._readBuffer.length == this._readBufferOffset) {
    // done reading response
    this._reading = false
    clearTimeout(this._readTimeout)

    if(this._readChecksumData != this._readChecksum) {
      this.emit('error', new Error('Checksum failed!'))
    } else {
      this.emit('response', this._readBuffer)
    }
  }
}

BrickPi.prototype._setupSensors = function() {
  var tasks = []

  for (var i = 0; i < this._serialAddresses.length; i++) {
    var startingBitLocation = 0
    var sensorData = new BitSet()

    for (var sensorCount = 0; sensorCount < 2; sensorCount++) {
      var currentSensor = this._sensors[i * 2 + sensorCount]

      if (!currentSensor) {
        continue
      }

      // request that each sensor encode itself into the packet.
      currentSensor._encodeToSetup(sensorData, startingBitLocation)
    }

    var packet = sensorData.toByteArray()

    packet.unshift(0)
    packet.unshift(0)
    packet.unshift(PROTOCOL.CONFIGURE_SENSORS)

    // fill in bytes 1 & 2 the sensor types. Counter is still the serial target
    // sensor count is 1 or 2 so the second or third byte in the message.
    for (var sensorCount = 0; sensorCount < 2; sensorCount++) {
      if (this._sensors[i * 2 + sensorCount] == null) {
        packet[1 + sensorCount] = 0
      } else {
        packet[1 + sensorCount] = this._sensors[i * 2 + sensorCount].type;
      }
    }

    tasks.push(this._sendToBrickPiWithRetry.bind(this, i, packet))
  }

  async.series(tasks, function(error) {
    if(error) {
      return this.emit('error', error)
    }

    this._sensorsModified = false
  }.bind(this))
}

BrickPi.prototype._updateValues = function() {
  var tasks = []

  for (var i = 0; i < this._serialAddresses.length; i++) {
    var startingBitLocation = 0
    var pollingData = new BitSet()

    // encoder offsets are not supported.  This code will need to be changed
    // when they are.  When there are no encoder offsets, the first two bits of the
    // bitset need to be zeroed.
    //pollingData.clear(0, 2);

    startingBitLocation += 2;  // account for these bits.

    for(var motorCount = 0; motorCount < 2; motorCount++) {
      var motor = this._motors[i * 2 + motorCount];

      if(motor != null) {
        // request that each motor encode itself into the packet.
        startingBitLocation = motor._encodeToValueRequest(pollingData, startingBitLocation);
      } else {
        // we have to encode 10 bits of zero.
        pollingData.clear(startingBitLocation, startingBitLocation + 10);
        startingBitLocation += 10;
      }
    }

    for(var sensorCount = 0; sensorCount < 2; sensorCount++) {
      var currentSensor = this._sensors[i * 2 + sensorCount];

      if (currentSensor != null) {
        // request that each sensor encode itself into the packet.
        startingBitLocation = currentSensor._encodeToValueRequest(pollingData, startingBitLocation);
      }
    }

    // create a packet of the correct size and fill in the header data.
    var packet = [
        PROTOCOL.READ_SENSOR_VALUES
    ].concat(pollingData.toByteArray())

    tasks.push(this._sendToBrickPiWithRetry.bind(this, i, packet))
  }

  async.serial(tasks, function(error) {
    if(error) {
        this.emit('error', error)
    }

    setTimeout(this._updateValues.bind(this), 100)
  }.bind(this))
}

BrickPi.prototype._onData = function(data) {
  if(data[0] == PROTOCOL.READ_SENSOR_VALUES) {
    this._onReadSensorValues(data)
  }
}

BrickPi.prototype._onReadSensorValues = function(data) {
  var counter = 1

  var startingBitLocation = 8; // the message type is still in there, so forget that
  // there are 5 bits associated with each of the encoders
  // these are then encode word length.
  var bitLength = 5;

  // I think that the motor decode method could/should be used to decode these values
  // problem is that it's encoder0 length, encoder1 length, encoder0 value, encoder1 value
  // rather than dealing with each encoder as a block.
  var encoderWordLength0 = Utils.decodeInt(bitLength, data, startingBitLocation);
  startingBitLocation += 5;  // skip encoder lengths
  var encoderWordLength1 = Utils.decodeInt(bitLength, data, startingBitLocation);
  startingBitLocation += 5;  // skip encoder lengths
  var motor = this.motor(counter * 2);

  if (motor != null) {
    motor._decodeValues(encoderWordLength0, data, startingBitLocation);
  }

  //int encoderVal0 = decodeInt(encoderWordLength0, incoming, startingBitLocation);
  startingBitLocation += encoderWordLength0;
  motor = this.motor(counter * 2 + 1);

  if (motor != null) {
      motor._decodeValues(encoderWordLength1, data, startingBitLocation);
  }

  //int encoderVal1 = decodeInt(encoderWordLength1, incoming, startingBitLocation);
  startingBitLocation += encoderWordLength1;
  for (var sensorCount = 0; sensorCount < 2; sensorCount++) {
    var currentSensor = this.sensor(counter * 2 + sensorCount);

    if (currentSensor != null) {
      // request that each sensor encode itself into the packet.
      startingBitLocation = currentSensor._decodeValues(data, startingBitLocation);
    } else {
      startingBitLocation += 10;  // the default seems to be 10 bits....
    }
  }
}

module.exports = BrickPi
