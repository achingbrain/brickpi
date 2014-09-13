var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  SerialPort = require('serialport').SerialPort,
  async = require('async'),
  LED = require('./LED'),
  PROTOCOL = require('./Protocol'),
  Utils = require('./Utils'),
  Bitsy = require('bitsy').Bitsy

var BrickPi = function(port, options, callback) {
  EventEmitter.call(this)

  if(options instanceof Function || !options) {
    callback = options
    options = {
      baudrate: 500000,
      timeout: 2000
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
  this._serialPort.on('open', this.setCommunicationTimeout.bind(this, options.timeout, function(error) {
      if(!error) {
        // start polling the BrickPi for data
        setTimeout(this._updateValues.bind(this), 100)
      }

      callback(error)
  }.bind(this)))
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
  if(port < 0 || port > 5) {
    throw new Error('Please pass a valid port number when adding a sensor')
  }

  if(!this._sensorsModified) {
    this._sensorsModified = true
    process.nextTick(this._setupSensors.bind(this))
  }

  this._sensors[port] = sensor
  
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

  return motor
}

BrickPi.prototype.motor = function(index) {
  return this._motors[index]
}

BrickPi.prototype.setCommunicationTimeout = function(timeout, callback) {
  var packet = [
    PROTOCOL.SET_COMMUNICATION_TIMEOUT,
    timeout & 0xFF,
    (timeout >> 8) & 0xFF,
    (timeout >> 16) & 0xFF,
    (timeout >> 24) & 0xFF
  ];

  var tasks = []

  for(var i = 0; i < this._serialAddresses.length; i++) {
    tasks.push(function(index, packet, callback) {
        this.once('setCommunicationTimeout', callback)
        this._sendToBrickPiWithRetry(index, packet)
    }.bind(this, i, packet))
  }

  async.series(tasks, callback)
}

BrickPi.prototype.emergencyStop = function() {
  this._motors.forEach(function(motor) {
      motor.speed(0)
  })
  
  this._sendToBrickPiWithRetry(0, [PROTOCOL.EMERGENCY_STOP])
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
  this._sendToBrickPiWithRetry(0, [PROTOCOL.CHANGE_UART_ADDRESS, address & 0xFF])
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
        console.warn('Retrying communication with BrickPi.')
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
    var offset = 0
    var sensorData = new Bitsy()
    var packet = [
      PROTOCOL.CONFIGURE_SENSORS,
      0,
      0
    ]

    for (var k = 0; k < 2; k++) {
      var sensor = this._sensors[i * 2 + k]

      if (!sensor) {
        continue
      }

      // request that each sensor encode itself into the packet.
      offset = sensor._encodeToSetup(sensorData, offset)
      packet[k + 1] = sensor.type
    }

    // add the bits to our outgoing packet
    for(var k = 0; k < sensorData.buffer.length; k++) {
      packet.push(sensorData.buffer[k])
    }

    tasks.push(this._sendToBrickPiWithRetry.bind(this, i, packet))
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
    var startingBitLocation = 0
    var pollingData = new Bitsy(22) // 2x motors with 10 bits each + 2 for the encoder offsets

    // encoder offsets are not supported.  This code will need to be changed
    // when they are.  When there are no encoder offsets, the first two bits of the
    // bitset need to be zeroed.
    //pollingData.clear(0, 2)

    // account for these bits.
    startingBitLocation += 2 

    for(var motorCount = 0; motorCount < 2; motorCount++) {
      var motor = this._motors[i * 2 + motorCount];

      if(motor != null) {
        console.info('looking at motor', (i * 2 + motorCount))
          
        // request that each motor encode itself into the packet.
        startingBitLocation = motor._encodeToValueRequest(pollingData, startingBitLocation);
      } else {
        // we have to encode 10 bits of zero.
        for(var k = startingBitLocation; k < (startingBitLocation + 10); k++) {
            pollingData.set(k, 0)
        }
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
    ].concat(pollingData.buffer)

    tasks.push(function(address, callback) {
        this.once('readSensorData', function(error, data) {
            if(error) return this.emit('error', error)
            
            this._onReadSensorValues(address, data)

            callback()
        }.bind(this))

        this._sendToBrickPiWithRetry(address, packet)
    }.bind(this, i))
  }

  async.series(tasks, function(error) {
    if(error) return this.emit('error', error)

    setTimeout(this._updateValues.bind(this), 100)
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
  
  // the message type is still in there, so forget that
  var startingBitLocation = 8

  // there are 5 bits associated with each of the encoders
  // these are then encode word length.
  //var bitLength = 5
  
  // i must find a better bitset library
  var incoming = new Bitsy()
  incoming.buffer = new Buffer(data)
  incoming.length = incoming.buffer.length * 8
  
  var motor = this.motor(chipIndex * 2);

  if (motor != null) {
    motor._readEncoderValue(incoming, startingBitLocation);
  }
  
  startingBitLocation += 5
  
  motor = this.motor((chipIndex * 2) + 1);

  if (motor != null) {
    motor._readEncoderValue(incoming, startingBitLocation);
  }
  
  startingBitLocation += 5
  
/*
  // I think that the motor decode method could/should be used to decode these values
  // problem is that it's encoder0 length, encoder1 length, encoder0 value, encoder1 value
  // rather than dealing with each encoder as a block.
  var encoderWordLength0 = Utils.decodeInt(bitLength, incoming, startingBitLocation);
  startingBitLocation += 5;  // skip encoder lengths

  var encoderWordLength1 = Utils.decodeInt(bitLength, incoming, startingBitLocation);
  startingBitLocation += 5;  // skip encoder lengths

  var motor = this.motor(chipIndex * 2);

  if (motor != null) {
    motor._decodeValue(encoderWordLength0, incoming, startingBitLocation);
  }

  startingBitLocation += encoderWordLength0;

  motor = this.motor(chipIndex * 2 + 1);

  if (motor != null) {
    motor._decodeValue(encoderWordLength1, incoming, startingBitLocation);
  }

  startingBitLocation += encoderWordLength1;
*/
  for (var sensorCount = 0; sensorCount < 2; sensorCount++) {
    var currentSensor = this.sensor(chipIndex * 2 + sensorCount);

    if (currentSensor != null) {
      // request that each sensor decode itself from the packet.
      startingBitLocation = currentSensor._decodeValue(incoming, startingBitLocation);
    } else {
      startingBitLocation += 10;  // the default seems to be 10 bits....
    }
  }
}

BrickPi.Motor = require('./Motor');
BrickPi.Sensors = {
  Colour: require('./ColourSensor'),
  Distance: require('./DistanceSensor'),
  Light: require('./LightSensor'),
  Touch: require('./TouchSensor')
}
BrickPi.PORTS = {
  S1: 0,
  S2: 1,
  S3: 2,
  S4: 3,
  S5: 4,

  MA: 0,
  MB: 1,
  MC: 2,
  MD: 3
}

module.exports = BrickPi
