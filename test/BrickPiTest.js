var expect = require('chai').expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire'),
  PROTOCOL = require('../lib/Protocol')

describe('BrickPi', function() {

  var BrickPi, SerialPort, LED

  before(function(done) {
    SerialPort = function() {
      this.on = sinon.stub(),
      this.write = sinon.stub(),
      this.flush = sinon.stub()
    }
    LED = function() {
      this.off = sinon.stub()
    }
    LED['@noCallThru'] = true
    
    BrickPi = proxyquire('../lib/BrickPi', {
      'serialport': {
        SerialPort: SerialPort
      },
      './LED': LED
    })
    
    done()
  })

  it('should have two LEDs', function() {
    var brickPi = new BrickPi()

    expect(brickPi.led(0)).to.be.ok
    expect(brickPi.led(1)).to.be.ok

    expect(brickPi.led(0) instanceof LED).to.be.true
    expect(brickPi.led(1) instanceof LED).to.be.true
  })

  it('should send bytes to the serial port', function(done) {
    var chipIndex = 0
    var command = 0x01
    var data = [0x02, 0x03, 0x04]

    var brickPi = new BrickPi()
    brickPi._serialPort.flush.callsArg(0)
    brickPi._serialPort.write.callsArg(1)

    brickPi._sendToBrickPi(chipIndex, command, data, function() {
      var buffer = brickPi._serialPort.write.getCall(0).args[0]

      expect(buffer[0]).to.equal(chipIndex) // chip to send data to
      expect(buffer[1]).to.equal(14) // checksum
      expect(buffer[2]).to.equal(data.length + 1) // length
      expect(buffer[3]).to.equal(command) // command
      expect(buffer[4]).to.equal(data[0]) // data
      expect(buffer[5]).to.equal(data[1]) // data
      expect(buffer[6]).to.equal(data[2]) // data

      done()
    })
  })

  it('should read bytes from the serial port', function(done) {
    var data = [0x01, 0x02, 0x03]

    var brickPi = new BrickPi()
    brickPi.on('response', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    var checksum = data.length + data.reduce(function(a, b) {
      return a + b;
    });

    brickPi._readFromBrickPi([checksum, data.length].concat(data))
  })

  it('should read bytes from the serial port in batches', function(done) {
    var data = [0x01, 0x02, 0x03]

    var brickPi = new BrickPi()
    brickPi.on('response', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    var checksum = data.length + data.reduce(function(a, b) {
      return a + b;
    });

    brickPi._readFromBrickPi([checksum, data.length])
    brickPi._readFromBrickPi(data)
  })
  
  it('should read bytes from the serial port in really small batches', function(done) {
    var data = [0x01, 0x02, 0x03]

    var brickPi = new BrickPi()
    brickPi.on('response', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    var checksum = data.length + data.reduce(function(a, b) {
      return a + b;
    });

    brickPi._readFromBrickPi([checksum])
    brickPi._readFromBrickPi([data.length])
    brickPi._readFromBrickPi([data[0]])
    brickPi._readFromBrickPi([data[1]])
    brickPi._readFromBrickPi([data[2]])
  })

  it('should object if read checksum is wrong', function(done) {
    var data = [0x01, 0x02, 0x03]

    var brickPi = new BrickPi()
    brickPi.on('response', function(error) {
      expect(error instanceof Error).to.be.true

      done()
    })

    var checksum = 1

    brickPi._readFromBrickPi([checksum, data.length].concat(data))
  })

  it('should set timeout', function(done) {
    var brickPi = new BrickPi()
    brickPi._serialPort = {
      write: sinon.stub(),
      flush: sinon.stub()
    }

    brickPi._serialPort.flush.callsArg(0)
    brickPi._serialPort.write.callsArg(1)

    brickPi.setCommunicationTimeout(10000)

    expect(brickPi._serialPort.write.callCount).to.equal(1)

    expect(brickPi._serialPort.write.getCall(0).args[0][0]).to.equal(0x01) // chip select
    expect(brickPi._serialPort.write.getCall(0).args[0][1]).to.equal(0x42) // checksum
    expect(brickPi._serialPort.write.getCall(0).args[0][2]).to.equal(0x05) // packet length
    expect(brickPi._serialPort.write.getCall(0).args[0][3]).to.equal(PROTOCOL.SET_COMMUNICATION_TIMEOUT)
    expect(brickPi._serialPort.write.getCall(0).args[0][4]).to.equal(0x10)
    expect(brickPi._serialPort.write.getCall(0).args[0][5]).to.equal(0x27)
    expect(brickPi._serialPort.write.getCall(0).args[0][6]).to.equal(0x00)
    expect(brickPi._serialPort.write.getCall(0).args[0][7]).to.equal(0x00)

    done()
  })

  it('should set initial motor speeds to 0', function(done) {
    var brickPi = new BrickPi()
    brickPi._serialPort = {
      write: sinon.stub(),
      flush: sinon.stub()
    }

    brickPi._serialPort.flush.callsArg(0)
    brickPi._serialPort.write.callsArg(1)

    brickPi.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MB)
    brickPi.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MC)

    brickPi._updateValues()

    expect(brickPi._serialPort.write.callCount).to.equal(1)
    expect(brickPi._serialPort.write.getCall(0).args[0][0]).to.equal(0x01) // chip select
    expect(brickPi._serialPort.write.getCall(0).args[0][1]).to.equal(0x08) // checksum
    expect(brickPi._serialPort.write.getCall(0).args[0][2]).to.equal(0x04) // packet length
    expect(brickPi._serialPort.write.getCall(0).args[0][3]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(brickPi._serialPort.write.getCall(0).args[0][4]).to.equal(0x00)
    expect(brickPi._serialPort.write.getCall(0).args[0][5]).to.equal(0x00)
    expect(brickPi._serialPort.write.getCall(0).args[0][6]).to.equal(0x00)

    done()
  })

  it('should set motor speeds to 200', function(done) {
    var brickPi = new BrickPi()
    brickPi._serialPort = {
      write: sinon.stub(),
      flush: sinon.stub()
    }

    brickPi._serialPort.flush.callsArg(0)
    brickPi._serialPort.write.callsArg(1)

    var left = brickPi.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MB)
    var right = brickPi.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MC)

    left.speed(200)
    right.speed(200)

    brickPi._updateValues()

    expect(brickPi._serialPort.write.callCount).to.equal(1)
    expect(brickPi._serialPort.write.getCall(0).args[0][0]).to.equal(0x01)
    expect(brickPi._serialPort.write.getCall(0).args[0][1]).to.equal(0x4A)
    expect(brickPi._serialPort.write.getCall(0).args[0][2]).to.equal(0x04)
    expect(brickPi._serialPort.write.getCall(0).args[0][3]).to.equal(PROTOCOL.READ_SENSOR_VALUES)
    expect(brickPi._serialPort.write.getCall(0).args[0][4]).to.equal(0x00)
    expect(brickPi._serialPort.write.getCall(0).args[0][5]).to.equal(0x10)
    expect(brickPi._serialPort.write.getCall(0).args[0][6]).to.equal(0x32)

    done()
  })

  it('should configure an ultrasonic sensor', function(done) {
    var brickPi = new BrickPi()
    brickPi._serialPort = {
      write: sinon.stub(),
      flush: sinon.stub()
    }

    brickPi._serialPort.flush.callsArg(0)
    brickPi._serialPort.write.callsArg(1)

    brickPi.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S1)

    brickPi._setUpSensors()

    expect(brickPi._serialPort.write.callCount).to.equal(1)
    expect(brickPi._serialPort.write.getCall(0).args[0][0]).to.equal(0x01)
    expect(brickPi._serialPort.write.getCall(0).args[0][1]).to.equal(0x87)
    expect(brickPi._serialPort.write.getCall(0).args[0][2]).to.equal(0x08)
    expect(brickPi._serialPort.write.getCall(0).args[0][3]).to.equal(PROTOCOL.CONFIGURE_SENSORS)
    expect(brickPi._serialPort.write.getCall(0).args[0][4]).to.equal(0x29)
    expect(brickPi._serialPort.write.getCall(0).args[0][5]).to.equal(0x00)
    expect(brickPi._serialPort.write.getCall(0).args[0][6]).to.equal(0x0A)
    expect(brickPi._serialPort.write.getCall(0).args[0][7]).to.equal(0x08)
    expect(brickPi._serialPort.write.getCall(0).args[0][8]).to.equal(0x1C)
    expect(brickPi._serialPort.write.getCall(0).args[0][9]).to.equal(0x21)
    expect(brickPi._serialPort.write.getCall(0).args[0][10]).to.equal(0x04)

    done()
  })

  it('should read 255 from an ultrasonic sensor', function(done) {
    var brickPi = new BrickPi()

    var sensor = brickPi.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S1)

    brickPi._updateValues()
    brickPi._onData(null, [0x03, 0x10, 0xb0, 0x75, 0xff, 0xff, 0x3f])

    expect(sensor.value).to.equal(255)

    done()
  })

  it('should read 21 from an ultrasonic sensor', function(done) {
    var brickPi = new BrickPi()

    var sensor = brickPi.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S1)

    brickPi._updateValues()
    brickPi._onData(null, [0x03, 0x00, 0xAC, 0xF8, 0x1F])

    expect(sensor.value).to.equal(21)

    done()
  })

  it('should configure all of the sensors', function(done) {
    var brickPi = new BrickPi()
    brickPi._serialPort = {
      write: sinon.stub(),
      flush: sinon.stub()
    }

    brickPi._serialPort.flush.callsArg(0)
    brickPi._serialPort.write.callsArg(1)

    brickPi.addSensor(new BrickPi.Sensors.NXT.Light(), BrickPi.PORTS.S1)
    brickPi.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S2)
    brickPi.addSensor(new BrickPi.Sensors.NXT.Touch(), BrickPi.PORTS.S3)
    brickPi.addSensor(new BrickPi.Sensors.NXT.Sound(), BrickPi.PORTS.S4)

    brickPi._setUpSensors()

    expect(brickPi._serialPort.write.callCount).to.equal(1)
    expect(brickPi._serialPort.write.getCall(0).args[0][0]).to.equal(0x01)
    expect(brickPi._serialPort.write.getCall(0).args[0][1]).to.equal(0x87)
    expect(brickPi._serialPort.write.getCall(0).args[0][2]).to.equal(0x08)
    expect(brickPi._serialPort.write.getCall(0).args[0][3]).to.equal(PROTOCOL.CONFIGURE_SENSORS)
    expect(brickPi._serialPort.write.getCall(0).args[0][4]).to.equal(0x00)
    expect(brickPi._serialPort.write.getCall(0).args[0][5]).to.equal(0x29)
    expect(brickPi._serialPort.write.getCall(0).args[0][6]).to.equal(0x0A)
    expect(brickPi._serialPort.write.getCall(0).args[0][7]).to.equal(0x08)
    expect(brickPi._serialPort.write.getCall(0).args[0][8]).to.equal(0x1C)
    expect(brickPi._serialPort.write.getCall(0).args[0][9]).to.equal(0x21)
    expect(brickPi._serialPort.write.getCall(0).args[0][10]).to.equal(0x04)

    brickPi.emit('_setUpSensors', null, [0x02])

    expect(brickPi._serialPort.write.callCount).to.equal(2)
    expect(brickPi._serialPort.write.getCall(1).args[0][0]).to.equal(0x02)
    expect(brickPi._serialPort.write.getCall(1).args[0][1]).to.equal(0x27)
    expect(brickPi._serialPort.write.getCall(1).args[0][2]).to.equal(0x03)
    expect(brickPi._serialPort.write.getCall(1).args[0][3]).to.equal(PROTOCOL.CONFIGURE_SENSORS)
    expect(brickPi._serialPort.write.getCall(1).args[0][4]).to.equal(0x20)
    expect(brickPi._serialPort.write.getCall(1).args[0][5]).to.equal(0x00)

    done()
  })

  it('should read all of the values', function(done) {
    var brickPi = new BrickPi()

    var light = brickPi.addSensor(new BrickPi.Sensors.NXT.Light(), BrickPi.PORTS.S1)
    var distance = brickPi.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S2)
    var touch = brickPi.addSensor(new BrickPi.Sensors.NXT.Touch(), BrickPi.PORTS.S3)
    var sound = brickPi.addSensor(new BrickPi.Sensors.NXT.Sound(), BrickPi.PORTS.S4)

    brickPi._updateValues()
    brickPi._onData(null, [0x03, 0x40, 0x08, 0xE1, 0x7F])
    brickPi._onData(null, [0x03, 0x02, 0xFC, 0x70])

    expect(light.value).to.equal(47)
    expect(distance.value).to.equal(255)
    expect(touch.value).to.be.true
    expect(sound.value).to.equal(9)

    done()
  })

  it('should move a motor to 180 degrees', function(done) {
    var brickPi = new BrickPi()

    var motor = brickPi.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MB)

    motor.to(180, 255)

    done()
  })
})
