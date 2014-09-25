var expect = require('chai').expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire')

describe('BrickPi', function() {

  var BrickPi, LED

  before(function() {
    SerialPortWrapper = function() {
      this.write = sinon.stub()
      this.once = sinon.stub()
    }
    LED = function() {
      this.off = sinon.stub()
    }
    LED['@noCallThru'] = true

    BrickPi = proxyquire('../lib/BrickPi', {
      './SerialPortWrapper': SerialPortWrapper,
      './LED': LED
    })
  })

  it('should have two LEDs', function() {
    var brickPi = new BrickPi()

    expect(brickPi.led(0)).to.be.ok
    expect(brickPi.led(1)).to.be.ok

    expect(brickPi.led(0) instanceof LED).to.be.true
    expect(brickPi.led(1) instanceof LED).to.be.true
  })

  it('should not allow non-I2C sensors on port 5', function(done) {
    var brickPi = new BrickPi()

    try {
      brickPi.addSensor(new BrickPi.Sensors.NXT.Light(), BrickPi.PORTS.S5)
    } catch(e) {
      done()
    }
  })

  it('should make a fuss for sensor ports below range', function(done) {
    var brickPi = new BrickPi()

    try {
      brickPi.addSensor(new BrickPi.Sensors.NXT.Light(), -1)
    } catch(e) {
      done()
    }
  })

  it('should make a fuss for sensor ports over range', function(done) {
    var brickPi = new BrickPi()

    try {
      brickPi.addSensor(new BrickPi.Sensors.NXT.Light(), 5)
    } catch(e) {
      done()
    }
  })

  it('should make a fuss for non-numeric sensor ports', function(done) {
    var brickPi = new BrickPi()

    try {
      brickPi.addSensor(new BrickPi.Sensors.NXT.Light(), 'foo')
    } catch(e) {
      done()
    }
  })

  it('should make a fuss for motor ports below range', function(done) {
    var brickPi = new BrickPi()

    try {
      brickPi.addMotor(new BrickPi.Motor(), -1)
    } catch(e) {
      done()
    }
  })

  it('should make a fuss for motor ports over range', function(done) {
    var brickPi = new BrickPi()

    try {
      brickPi.addMotor(new BrickPi.Motor(), 4)
    } catch(e) {
      done()
    }
  })

  it('should make a fuss for non-numeric motor ports', function(done) {
    var brickPi = new BrickPi()

    try {
      brickPi.addMotor(new BrickPi.Motor(), 'foo')
    } catch(e) {
      done()
    }
  })

  it('should set timeout and notify via callback', function(done) {
    var brickPi = new BrickPi()
    brickPi._arduinos = [{
        setCommunicationTimeout: sinon.stub()
      }, {
        setCommunicationTimeout: sinon.stub()
      }
    ]

    brickPi._arduinos[0].setCommunicationTimeout.callsArg(1)
    brickPi._arduinos[1].setCommunicationTimeout.callsArg(1)

    brickPi.setCommunicationTimeout(10000, done)

    // twice because both arduinos need to respond
    expect(brickPi._arduinos[0].setCommunicationTimeout.getCall(0).args[0]).to.equal(10000)
    expect(brickPi._arduinos[1].setCommunicationTimeout.getCall(0).args[0]).to.equal(10000)
  })

  it('should initiate emergency stop and notify via callback', function(done) {
    var brickPi = new BrickPi()
    brickPi._arduinos = [{
        emergencyStop: sinon.stub()
      }, {
        emergencyStop: sinon.stub()
      }
    ]

    brickPi._arduinos[0].emergencyStop.callsArg(0)
    brickPi._arduinos[1].emergencyStop.callsArg(0)

    brickPi.emergencyStop(done)

    expect(brickPi._arduinos[0].emergencyStop.callCount).to.equal(1)
    expect(brickPi._arduinos[1].emergencyStop.callCount).to.equal(1)
  })

  it('should tell both arduinos to update their values', function() {
    var brickPi = new BrickPi()
    brickPi._arduinos = [{
        updateValues: sinon.stub()
      }, {
        updateValues: sinon.stub()
      }
    ]

    brickPi._arduinos[0].updateValues.callsArg(0)
    brickPi._arduinos[1].updateValues.callsArg(0)

    brickPi.updateValues()

    // twice because both arduinos need to respond
    expect(brickPi._arduinos[0].updateValues.callCount).to.equal(1)
    expect(brickPi._arduinos[1].updateValues.callCount).to.equal(1)
  })

  it('should tell both arduinos to update their values and notify via callback', function(done) {
    var brickPi = new BrickPi()
    brickPi._arduinos = [{
        updateValues: sinon.stub()
      }, {
        updateValues: sinon.stub()
      }
    ]

    brickPi._arduinos[0].updateValues.callsArg(0)
    brickPi._arduinos[1].updateValues.callsArg(0)

    brickPi.updateValues(done)
  })

  it('should return the right sensor', function() {
    var brickPi = new BrickPi()

    var sensor = new BrickPi.Sensors.NXT.Light()

    brickPi.addSensor(sensor, BrickPi.PORTS.S1)

    expect(brickPi.sensor(BrickPi.PORTS.S1)).to.equal(sensor)
  })

  it('should return the right motor', function() {
    var brickPi = new BrickPi()

    var motor = new BrickPi.Motor()

    brickPi.addMotor(motor, BrickPi.PORTS.MA)

    expect(brickPi.motor(BrickPi.PORTS.MA)).to.equal(motor)
  })
})
