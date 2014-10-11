var PROTOCOL = require('./Protocol'),
  BitArray = require('./BitArray'),
  EventEmitter = require('events').EventEmitter,
  util = require('util')

var Arduino = function(index, serialPort) {
  EventEmitter.call(this)

  this._chipIndex = index
  this._serialPort = serialPort

  this._sensors = []
  this._motors = []

  // If we add sensors we need to tell the BrickPi what type they are.
  // Use this variable to batch such updates together.
  this._sensorsModified = false
}
util.inherits(Arduino, EventEmitter)

Arduino.prototype.setCommunicationTimeout = function(timeout, callback) {
  var packet = [
    timeout & 0xFF,
    (timeout >> 8) & 0xFF,
    (timeout >> 16) & 0xFF,
    (timeout >> 24) & 0xFF
  ]

  this._serialPort.write(this._chipIndex, PROTOCOL.SET_COMMUNICATION_TIMEOUT, packet, callback)
}

Arduino.prototype.emergencyStop = function(callback) {
  //this._motors.forEach(function(motor) {
  //    motor.speed(0)
  //})

  this._serialPort.write(this._chipIndex, PROTOCOL.EMERGENCY_STOP, [], callback)
}

Arduino.prototype.addSensor = function(sensor, port) {
  sensor.setArduino(this)

  this._sensors[port] = sensor

  this.setUpSensors()

  sensor.on('changed', this.setUpSensors.bind(this))

  return sensor
}

Arduino.prototype.sensor = function(port) {
    return this._sensors[port]
}

Arduino.prototype.addMotor = function(motor, port) {
  motor.setArduino(this)

  this._motors[port] = motor

  this.updateValues()

  return motor
}

Arduino.prototype.motor = function(port) {
  return this._motors[port]
}

Arduino.prototype.setUpSensors = function() {
  if(this._sensorsModified) {
    return
  }

  this._sensorsModified = true
  process.nextTick(this._setUpSensors.bind(this))
}

Arduino.prototype._setUpSensors = function() {
  var tasks = []

  var sensorData = new BitArray()

  // add sensor types
  var sensor1 = this._sensors[0];
  var sensor2 = this._sensors[1];

  sensorData.addBits(0, 0, 8, sensor1 ? sensor1.type : 0)
  sensorData.addBits(0, 0, 8, sensor2 ? sensor2.type : 0)

  if(sensor1) {
    sensor1._encodeToSetup(sensorData)
  }

  if(sensor2) {
    sensor2._encodeToSetup(sensorData)
  }

  this._serialPort.write(this._chipIndex, PROTOCOL.CONFIGURE_SENSORS, sensorData.getArray(), function(error, data) {
    this._sensorsModified = false

    this.emit('setUpSensors', error)
  }.bind(this))
}

Arduino.prototype.updateValues = function(callback) {
  if(callback) {
    this.once('updatedValues', callback)
  }

  if(this._updatingValues) {
    return
  }

  this._updatingValues = true

  process.nextTick(this._updateValues.bind(this))
}

Arduino.prototype._updateValues = function() {
  var tasks = []

  // 2x motors with 10 bits each + 2 for the encoder offsets
  var pollingData = new BitArray()

  // encoder offsets are not supported.  This code will need to be changed
  // when they are.  Account for these bits.
  pollingData.addBits(0, 0, 2, 0)

  for(var motorCount = 0; motorCount < 2; motorCount++) {
    var motor = this._motors[motorCount];

    if(motor != null) {
      // request that each motor encode itself into the packet.
      motor._encodeSpeed(pollingData);
    } else {
      // pad 10 empty bits
      pollingData.addBits(0, 0, 10, 0)
    }
  }

  for(var sensorCount = 0; sensorCount < 2; sensorCount++) {
    var currentSensor = this._sensors[sensorCount];

    if (currentSensor != null) {
      // request that each sensor encode itself into the packet.
      currentSensor._encodeToValueRequest(pollingData);
    }
  }

  this._serialPort.write(this._chipIndex, PROTOCOL.READ_SENSOR_VALUES, pollingData.getArray(), this._updatedValues.bind(this))
}

Arduino.prototype._updatedValues = function(error, data) {
  this._updatingValues = false

  var incoming = new BitArray(data)

  var encoderLengths = [
    incoming.getBits(1, 0, 5),
    incoming.getBits(1, 0, 5)
  ]

  for(var motorCount = 0; motorCount < 2; motorCount++) {
    var value = incoming.getBits(1, 0, encoderLengths[motorCount])
    var motor = this.motor(motorCount)

    if(motor) {
      motor._setEncoderValue(value)
    }
  }

  for(var sensorCount = 0; sensorCount < 2; sensorCount++) {
    var sensor = this.sensor(sensorCount)

    if(sensor) {
      // request that each sensor decode itself from the packet.
      sensor._decodeValue(incoming)
    } else {
      incoming.getBits(1, 0, 10)
    }
  }

  this.emit('updatedValues', error)
}

module.exports = Arduino
