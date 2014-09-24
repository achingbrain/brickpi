var expect = require('chai').expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire'),
  PROTOCOL = require('../lib/Protocol'),
  Arduino = require('../lib/Arduino')

var bufferEquals = function(buff, arr) {
  for(var i = 0; i < arr.length; i++) {
    expect(buff[i]).to.equal(arr[i])
  }

  return true
}

describe('Arduino', function() {

  var BrickPi, LED

  before(function() {
    LED = function() {

    }
    LED['@noCallThru'] = true

    BrickPi = proxyquire('../lib/BrickPi', {
      './LED': LED
    })
  })

  it('should set timeout', function() {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    arduino.setCommunicationTimeout(10000)

    expect(serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.SET_COMMUNICATION_TIMEOUT)
    expect(bufferEquals(serialPort.write.getCall(0).args[2], [0x10, 0x27, 0x00, 0x00])).to.be.true
  })

  it('should set timeout and notify via callback', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    serialPort.write.callsArg(3)

    arduino.setCommunicationTimeout(10000, done)
  })

  it('should initiate emergency stop', function() {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    arduino.emergencyStop()

    expect(serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.EMERGENCY_STOP)
    expect(bufferEquals(serialPort.write.getCall(0).args[2], [])).to.be.true
  })

  it('should initiate emergency stop and notify via callback', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    serialPort.write.callsArg(3)

    arduino.emergencyStop(done)
  })

  it('should set initial motor speeds to 0', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    arduino.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MB)
    arduino.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MC)

    arduino._updateValues()

    expect(arduino._serialPort.write.callCount).to.equal(1)
    expect(arduino._serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(bufferEquals(arduino._serialPort.write.getCall(0).args[2], [0x00, 0x00, 0x00])).to.be.true

    done()
  })

  it('should set motor speeds to 200', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    var right = arduino.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MB.index)

    right.speed(200)

    arduino._updateValues()

    expect(arduino._serialPort.write.callCount).to.equal(1)
    expect(arduino._serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(bufferEquals(arduino._serialPort.write.getCall(0).args[2], [0x00, 0x10, 0x32])).to.be.true

    done()
  })

  it('should configure an ultrasonic sensor', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    arduino.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S1.index)

    arduino._setUpSensors()

    expect(arduino._serialPort.write.callCount).to.equal(1)
    expect(arduino._serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.CONFIGURE_SENSORS)
    expect(bufferEquals(arduino._serialPort.write.getCall(0).args[2], [0x29, 0x00, 0x0A, 0x08, 0x1C, 0x21, 0x04])).to.be.true

    done()
  })

  it('should read 255 from an ultrasonic sensor', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    var sensor = arduino.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S1.index)

    arduino._updateValues()
    arduino._updatedValues(null, [0x03, 0x10, 0xb0, 0x75, 0xff, 0xff, 0x3f])

    expect(sensor.value).to.equal(255)

    done()
  })

  it('should read 21 from an ultrasonic sensor', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    var sensor = arduino.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S1.index)

    arduino._updateValues()
    arduino._updatedValues(null, [0x03, 0x00, 0xAC, 0xF8, 0x1F])

    expect(sensor.value).to.equal(21)

    done()
  })

  it('should configure light and distance sensors', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    arduino.addSensor(new BrickPi.Sensors.NXT.Light(), BrickPi.PORTS.S1.index)
    arduino.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S2.index)

    arduino._setUpSensors()

    expect(arduino._serialPort.write.callCount).to.equal(1)
    expect(arduino._serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.CONFIGURE_SENSORS)
    expect(bufferEquals(arduino._serialPort.write.getCall(0).args[2], [0x00, 0x29, 0x0A, 0x08, 0x1C, 0x21, 0x04])).to.be.true

    done()
  })

  it('should configure touch and sound sensors', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    arduino.addSensor(new BrickPi.Sensors.NXT.Touch(), BrickPi.PORTS.S1.index)
    arduino.addSensor(new BrickPi.Sensors.NXT.Sound(), BrickPi.PORTS.S2.index)

    arduino._setUpSensors()

    expect(arduino._serialPort.write.callCount).to.equal(1)
    expect(arduino._serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.CONFIGURE_SENSORS)
    expect(bufferEquals(arduino._serialPort.write.getCall(0).args[2], [0x20, 0x00])).to.be.true

    done()
  })

  it('should read light and distance values', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    var light = arduino.addSensor(new BrickPi.Sensors.NXT.Light(), BrickPi.PORTS.S1.index)
    var distance = arduino.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S2.index)

    arduino._updateValues()
    arduino._updatedValues(null, [0x03, 0x40, 0x08, 0xE1, 0x7F])

    expect(light.value).to.equal(47)
    expect(distance.value).to.equal(255)

    done()
  })

  it('should read touch and sound values', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    var touch = arduino.addSensor(new BrickPi.Sensors.NXT.Touch(), BrickPi.PORTS.S1.index)
    var sound = arduino.addSensor(new BrickPi.Sensors.NXT.Sound(), BrickPi.PORTS.S2.index)

    arduino._updateValues()
    arduino._updatedValues(null, [0x03, 0x02, 0xFC, 0x70])

    expect(touch.value).to.be.true
    expect(sound.value).to.equal(9)

    done()
  })

  it('should move a motor to 180 degrees', function(done) {
    var index = 1
    var serialPort = {
      write: sinon.stub()
    }
    var arduino = new Arduino(index, serialPort)

    var motor = arduino.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MB.index)

    motor.rotate(180)

    // should have requested full speed
    expect(motor._requestedSpeed).to.equal(255)

    // should not know encoder value
    expect(motor._currentEncoderValue).to.equal(null)

    // set the speed and read the encoder value
    arduino._updateValues()

    // should have updated chip 1
    expect(arduino._serialPort.write.callCount).to.equal(1)
    expect(arduino._serialPort.write.getCall(0).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(0).args[1]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(bufferEquals(arduino._serialPort.write.getCall(0).args[2], [0x00, 0xD0, 0x3F])).to.be.true
    arduino._updatedValues(null, [0x03, 0xE0, 0x09, 0x89, 0xFF, 0xFF, 0x1F])

    // encoder value should have updated
    expect(motor._currentEncoderValue).to.equal(25154)

    // encoder target is set up
    arduino._updateValues()

    expect(arduino._serialPort.write.callCount).to.equal(2)
    expect(arduino._serialPort.write.getCall(1).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(1).args[1]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(bufferEquals(arduino._serialPort.write.getCall(1).args[2], [0x00, 0xD0, 0x3F])).to.be.true
    arduino._updatedValues(null, [0x03, 0xE0, 0x81, 0x8E, 0xFB, 0xF7, 0x1F])

    // encoder value should have updated
    expect(motor._currentEncoderValue).to.equal(25504)

    arduino._updateValues()

    expect(arduino._serialPort.write.callCount).to.equal(3)
    expect(arduino._serialPort.write.getCall(2).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(2).args[1]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(bufferEquals(arduino._serialPort.write.getCall(2).args[2], [0x00, 0xD0, 0x3F])).to.be.true
    arduino._updatedValues(null, [0x03, 0xE0, 0xD9, 0x95, 0xFD, 0xF7, 0x1F])

    // encoder value should have updated
    expect(motor._currentEncoderValue).to.equal(25974)

    // should now tell the motor to stop
    arduino._updateValues()

    expect(motor._requestedSpeed).to.equal(0)

    expect(arduino._serialPort.write.callCount).to.equal(4)
    expect(arduino._serialPort.write.getCall(3).args[0]).to.equal(index)
    expect(arduino._serialPort.write.getCall(3).args[1]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(bufferEquals(arduino._serialPort.write.getCall(3).args[2], [0x00, 0x10, 0x00])).to.be.true
    arduino._updatedValues(null, [0x03, 0xE0, 0x61, 0x9C, 0xFB, 0xFF, 0x1F])

    expect(motor._currentEncoderValue).to.equal(26392)

    done()
  })
})
