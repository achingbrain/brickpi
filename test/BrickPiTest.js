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

    brickPi._setupSensors()

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
})
