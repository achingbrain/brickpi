var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  async = require('async'),
  LED = require('./LED'),
  I2C = require('./I2C'),
  I2CSensor = require('./sensors/I2CSensor'),
  LOG = require('winston'),
  defaults = require('defaults'),
  SerialPortWrapper = require('./SerialPortWrapper'),
  Arduino = require('./Arduino')

LOG.remove(LOG.transports.Console)
LOG.add(LOG.transports.Console, {
  colorize: true,
  timestamp: true
})

var BrickPi = function() {
  EventEmitter.call(this)

  var port, options, callback

  for(var i = 0; i < arguments.length; i++) {
    if(typeof arguments[i] == 'function') {
      callback = arguments[i]
    } else if(typeof arguments[i] == 'object') {
      options = arguments[i]
    } else if(typeof arguments[i] == 'string') {
      port = arguments[i]
    }
  }

  if(!port) {
    port = '/dev/ttyAMA0'
  }

  options = defaults(options, {
    baudrate: 500000,
    timeout: 10000,
    debug: false
  })

  if(options.debug) {
    LOG.level = 'debug'
  }

  this._setUpLEDs([18, 27])

  var serialPort = new SerialPortWrapper(port, options)
  serialPort.once('ready', this.setCommunicationTimeout.bind(this, options.timeout, callback))

  this._arduinos = [
    new Arduino(1, serialPort),
    new Arduino(2, serialPort)
  ]
}
util.inherits(BrickPi, EventEmitter)

BrickPi.prototype.led = function(index) {
  return this._leds[index]
}

BrickPi.prototype.addSensor = function(sensor, port) {
  if(!this._validateSensorPort(port)) {
    throw new Error('Please pass a valid port!')
  }

  if(port == BrickPi.PORTS.S5 && !(sensor instanceof I2CSensor)) {
    throw new Error('Only I2C sensors are supported on S5. Please attach the sensor to a different port.')
  }

  if(port == BrickPi.PORTS.S5) {
    // S5 is an I2C port
  } else {
    return this._arduinos[port.chip].addSensor(sensor, port.index)
  }
}

BrickPi.prototype.sensor = function(port) {
  if(!this._validateSensorPort(port)) {
    throw new Error('Please pass a valid port!')
  }

  return this._arduinos[port.chip].sensor(port.index)
}

BrickPi.prototype.addMotor = function(motor, port) {
  if(!this._validateMotorPort(port)) {
    throw new Error('Please pass a valid port when adding a motor')
  }

  return this._arduinos[port.chip].addMotor(motor, port.index)
}

BrickPi.prototype._validateSensorPort = function(port) {
  if(port == BrickPi.PORTS.S5) {
    return true
  }

  return this._validateMotorPort(port)
}

BrickPi.prototype._validateMotorPort = function(port) {
  if(!port) {
    return false
  }

  if(isNaN(parseInt(port.chip, 10))) {
    return false
  }

  if(isNaN(parseInt(port.index, 10))) {
    return false
  }

  return true
}

BrickPi.prototype.motor = function(port) {
  if(!port || isNaN(parseInt(port.chip, 10)) || isNaN(parseInt(port.index, 10))) {
    throw new Error('Please pass a valid port!')
  }

  return this._arduinos[port.chip].motor(port.index)
}

BrickPi.prototype.setCommunicationTimeout = function(timeout, callback) {
  this._withEachArduino(function(arduino, callback) {
    arduino.setCommunicationTimeout(timeout, callback)
  }, 'setCommunicationTimeout', callback)
}

BrickPi.prototype._withEachArduino = function(func, event, callback) {
  if(callback) {
    this.once(event, callback)
  }

  var tasks = []

  this._arduinos.forEach(function(arduino) {
    tasks.push(func.bind(func, arduino))
  })

  async.series(tasks, this.emit.bind(this, event))
}

BrickPi.prototype.emergencyStop = function(callback) {
  this._withEachArduino(function(arduino, callback) {
    arduino.emergencyStop(callback)
  }, 'emergencyStop', callback)
}

BrickPi.prototype._setUpLEDs = function(pins) {
  this._leds = []

  pins.forEach(function(pin) {
    var led = new LED(pin)
    led.off()
    this._leds.push(led)
  }.bind(this))
}

BrickPi.prototype.updateValues = function(callback) {
  var tasks = []

  this._arduinos.forEach(function(arduino) {
    tasks.push(function(callback) {
      arduino.updateValues(callback)
    })
  })

  async.series(tasks, function(error) {
    if(callback) {
      callback(error)
    }

    this.emit('updatedValues')
  }.bind(this))
}

BrickPi.Motor = require('./Motor');
BrickPi.Sensors = {
  NXT: {
    Distance: require('./sensors/NXT/Distance'),
    Light: require('./sensors/NXT/Light'),
    Sound: require('./sensors/NXT/Sound'),
    Touch: require('./sensors/NXT/Touch')
  }
}
BrickPi.PORTS = require('./Ports')
BrickPi.I2C = I2C

module.exports = BrickPi
