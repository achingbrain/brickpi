var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  SerialPort = require('serialport').SerialPort,
  async = require('async'),
  LED = require('./LED'),
  PROTOCOL = require('./Protocol'),
  BitArray = require('./BitArray'),
  I2C = require('./I2C'),
  I2CSensor = require('./sensors/I2CSensor')

var BrickPi = function(port, options, callback) {
  EventEmitter.call(this)

  if(options instanceof Function || !options) {
    callback = options
    options = {
      baudrate: 500000,
      timeout: 10000
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
  this._serialPort.on('open', this.setCommunicationTimeout.bind(this, options.timeout, callback))
  this._serialPort.on('data', this._readFromBrickPi.bind(this))

  // handle incoming communications from the BrickPi
  this.on('response', this._onData.bind(this))

  this._sensorsModified = false
  this._motorsModified = false

  this._i2cSettings = []
}
util.inherits(BrickPi, EventEmitter)

BrickPi.prototype.led = function(index) {
  return this._leds[index]
}

BrickPi.prototype.addSensor = function(sensor, port) {
  if(port < 0 || port > 5) {
    throw new Error('Please pass a valid port number when adding a sensor.')
  }

  if(port == 4 && sensor instanceof I2CSensor) {
    throw new Error('I2C sensors are not supported on S5. Please attach the sensor to a different port.')
  }

  this._sensors[port] = sensor

  if(!this._sensorsModified) {
    this._sensorsModified = true
    process.nextTick(this._setupSensors.bind(this))
  }
  
  return sensor
}

BrickPi.prototype.sensor = function(index) {
    return this._sensors[index]
}

BrickPi.prototype.addMotor = function(motor, port) {
  if(port < 0 || port > 4) {
    throw new Error('Please pass a valid port number when adding a motor')
  }

  this._motors[port] = motor

  motor.on('speedChanged', function() {
    if(!this._motorsModified) {
      this._motorsModified = true
      process.nextTick(this._updateValues.bind(this))
    }
  }.bind(this))

  return motor
}

BrickPi.prototype.motor = function(index) {
  return this._motors[index]
}

BrickPi.prototype.setCommunicationTimeout = function(timeout, callback) {
  var packet = [
    timeout & 0xFF,
    (timeout >> 8) & 0xFF,
    (timeout >> 16) & 0xFF,
    (timeout >> 24) & 0xFF
  ]

  var tasks = []

  for(var i = 0; i < this._serialAddresses.length; i++) {
    tasks.push(function(index, packet, callback) {
        this.once('setCommunicationTimeout', callback)
        this._sendToBrickPiWithRetry(index, PROTOCOL.SET_COMMUNICATION_TIMEOUT, packet)
    }.bind(this, i, packet))
  }

  async.series(tasks, callback)
}

BrickPi.prototype.emergencyStop = function() {
  this._motors.forEach(function(motor) {
      motor.speed(0)
  })

  this._sendToBrickPiWithRetry(0, PROTOCOL.EMERGENCY_STOP, [])
}

BrickPi.prototype.setUARTAddress = function(address) {
  if(!(this._sensors[BrickPi.PORTS.S1] instanceof BrickPi.Sensors.Touch)) {
    return console.error('To set the UART address, please first connect a touch sensor to port S1 and configure it.')
  }

  if(this._sensors[BrickPi.PORTS.S1].value) {
    return console.error('To set the UART address, please first press and hold the button on the front of the touch sensor.')
  }
  
  this.once('changedUARTAddress', function(error, data) {
      console.info('Changed the UART address to', data[1])
  })

  console.info('Changing the UART address.')
  this._sendToBrickPiWithRetry(0, PROTOCOL.CHANGE_UART_ADDRESS, [address & 0xFF])
}

BrickPi.prototype._setUpLEDs = function(pins) {
  this._leds = []

  pins.forEach(function(pin) {
    var led = new LED(pin)
    led.off()
    this._leds.push(led)
  }.bind(this))
}

BrickPi.prototype._sendToBrickPiWithRetry = function(chipIndex, command, packet, callback) {
  var retries = 5
  var handler = function(error) {
    if(error && retries > 0) {
        retries--
        console.warn('Retrying communication with BrickPi.')
        return this._sendToBrickPi(this._serialAddresses[chipIndex], command, packet, handler)
    }

    if(callback) {
      callback(error)
    }
  }.bind(this)

  this._sendToBrickPi(this._serialAddresses[chipIndex], command, packet, handler)
}

BrickPi.prototype._sendToBrickPi = function(destinationAddress, command, data, callback) {
  var packet = new Buffer(data.length + 4)

  // clear the read buffer before writing...
  this._serialPort.flush(function(error) {
    if(error) return callback(error)

    // + 1 for the command byte
    var dataLength = data.length + 1

    // the checksum is the sum of all the bytes in the entire packet EXCEPT the checksum
    var checksum = destinationAddress + command + dataLength + Array.prototype.reduce.call(data, function(a, b, index) {
      packet[index + 4] = b & 0xFF
      return a + (b & 0xFF)
    }, 0);

    packet[0] = destinationAddress & 0xFF
    packet[1] = checksum & 0xFF
    packet[2] = dataLength
    packet[3] = command & 0xFF

    this._serialPort.write(new Buffer(packet), callback)
  }.bind(this))
}

BrickPi.prototype._readFromBrickPi = function(data) {
  //console.info('incoming', data)
  
  var offset = 0

  if(!this._reading) {
    if(this._readChecksum === null && data.length > offset) {
        // we are starting a new read
        // the first byte of the received packet in the checksum.
        // the second is the number of bytes in the packet.
        this._readChecksum = data[offset]
        offset++
        
        //console.info('checksum', this._readChecksum)
    }
    
    if(this._readLength === null && data.length > offset) {
        // the packet size does not include this two byte header.
        this._readLength = data[offset]
        this._readChecksumData = this._readLength
        offset++
        
        //console.info('expecting', this._readLength)
        
        this._readBuffer = new Buffer(this._readLength)
        this._readBufferOffset = 0    
    
        this._reading = true
        this._readTimeout = setTimeout(function() {
          this.emit('error', new Error('Read timeout'))
        }.bind(this), 5000)
    }
  }
  
  //console.info('offset', offset, 'data.length', data.length)

  for(var i = offset; i < data.length; i++) {
    this._readChecksumData += data[i]
    //console.info('adding', data[i], 'at', this._readBufferOffset)
    this._readBuffer[this._readBufferOffset] = data[i]
    this._readBufferOffset++
  }
  
  //console.info('read buffer', this._readBuffer)
  //console.info('read buffer offset', this._readBufferOffset, 'length', this._readBuffer.length)

  if(this._readBuffer && this._readBuffer.length == this._readBufferOffset) {
    // done reading response
    clearTimeout(this._readTimeout)
    this._reading = false

    var error = undefined;

    if((this._readChecksumData & 0xFF) != this._readChecksum) {
      //console.warn('this._readChecksumData & 0xFF =', this._readChecksumData, (this._readChecksumData & 0xFF), 'this._readChecksum =', this._readChecksum, 'this._readBuffer', this._readBuffer)

      error = new Error('Checksum failed!')
    }

    //console.info('----------')
    
    this._readChecksum = null
    this._readLength = null
    
    this.emit('response', error, this._readBuffer)
  }
}

BrickPi.prototype._setupSensors = function() {
  var tasks = []

  for (var i = 0; i < this._serialAddresses.length; i++) {
    var sensorData = new BitArray()

    // add sensor types
    var sensor1 = this._sensors[i * 2];
    var sensor2 = this._sensors[i * 2 + 1];

    sensorData.addBits(0, 0, 8, sensor1 ? sensor1.type : 0)
    sensorData.addBits(0, 0, 8, sensor2 ? sensor2.type : 0)

    if(sensor1) {
      sensor1._encodeToSetup(sensorData)
    }

    if(sensor2) {
      sensor2._encodeToSetup(sensorData)
    }

    tasks.push(function(address, packet, callback) {
      this.once('configuredSensors', callback)

      this._sendToBrickPiWithRetry(address, PROTOCOL.CONFIGURE_SENSORS, packet)
    }.bind(this, i, sensorData.getArray()))
  }

  async.series(tasks, function(error) {
    this._sensorsModified = false

    if(error) {
      return this.emit('error', error)
    }
  }.bind(this))
}

BrickPi.prototype._updateValues = function() {
  var tasks = []

  for (var i = 0; i < this._serialAddresses.length; i++) {

    // 2x motors with 10 bits each + 2 for the encoder offsets
    var pollingData = new BitArray()

    // encoder offsets are not supported.  This code will need to be changed
    // when they are.  Account for these bits.
    pollingData.addBits(0, 0, 2, 0)

    for(var motorCount = 0; motorCount < 2; motorCount++) {
      var motor = this._motors[i * 2 + motorCount];

      if(motor != null) {
        // request that each motor encode itself into the packet.
        motor._encodeSpeed(pollingData);
      } else {
        // pad 10 empty bits
        pollingData.addBits(0, 0, 10, 0)
      }
    }

    for(var sensorCount = 0; sensorCount < 2; sensorCount++) {
      var currentSensor = this._sensors[i * 2 + sensorCount];

      if (currentSensor != null) {
        // request that each sensor encode itself into the packet.
        currentSensor._encodeToValueRequest(pollingData);
      }
    }

    tasks.push(function(address, packet, callback) {
        this.once('readSensorData', function(error, data) {
            if(error) return this.emit('error', error)

            this._onReadSensorValues(address, data)

            callback()
        }.bind(this))

        this._sendToBrickPiWithRetry(address, PROTOCOL.READ_SENSOR_VALUES, packet)
    }.bind(this, i, pollingData.getArray()))
  }

  async.series(tasks, function(error) {
    if(error) return this.emit('error', error)

    this._motorsModified = false
  }.bind(this))
}

BrickPi.prototype._onData = function(error, data) {
  if(data[0] == PROTOCOL.CHANGE_UART_ADDRESS) {
    console.info('emitting changedUARTAddress')
    this.emit('changedUARTAddress', error, data)
  } else if(data[0] == PROTOCOL.CONFIGURE_SENSORS) {
    console.info('emitting configuredSensors')
    this.emit('configuredSensors', error, data)
  } else if(data[0] == PROTOCOL.READ_SENSOR_VALUES) {
    console.info('emitting readSensorData')
    this.emit('readSensorData', error, data)
  } else if(data[0] == PROTOCOL.EMERGENCY_STOP) {
    console.info('emitting emergencyStop')
    this.emit('emergencyStop', error, data)
  } else if(data[0] == PROTOCOL.SET_COMMUNICATION_TIMEOUT) {
    console.info('emitting setCommunicationTimeout')
    this.emit('setCommunicationTimeout', error, data)
  } else {
    this.emit('error', new Error('Unknown response code ' + data[0]))
  }
}

BrickPi.prototype._onReadSensorValues = function(chipIndex, data) {
  console.info('decoding values for chip', chipIndex, data)

  var incoming = new BitArray(data)

  // the message type is still in there, so forget that
  incoming.getBits(0, 0, 8)

  for(var motorCount = 0; motorCount < 2; motorCount++) {
    var motor = this.motor((chipIndex * 2) + motorCount);

    if(motor != null) {
      motor._readEncoderValue(incoming);
    }
  }

  for(var sensorCount = 0; sensorCount < 2; sensorCount++) {
    var currentSensor = this.sensor(chipIndex * 2 + sensorCount);

    if(currentSensor != null) {
      // request that each sensor decode itself from the packet.
      currentSensor._decodeValue(incoming);
    }
  }
}

BrickPi.Motor = require('./Motor');
BrickPi.Sensors = {
  NXT: {
    Colour: require('./sensors/NXT/NXTColourSensor'),
    Distance: require('./sensors/NXT/NXTDistanceSensor'),
    Light: require('./sensors/NXT/NXTLightSensor'),
    Touch: require('./sensors/NXT/NXTTouchSensor')
  }
}
BrickPi.PORTS = require('./Ports')
BrickPi.I2C = I2C

module.exports = BrickPi
