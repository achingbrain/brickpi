var expect = require('chai').expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire')

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
    var data = [0x01, 0x02, 0x03]

    var brickPi = new BrickPi()
    brickPi._serialPort.flush.callsArg(0)
    brickPi._serialPort.write.callsArg(1)

    brickPi._sendToBrickPi(chipIndex, data, function() {
      var buffer = brickPi._serialPort.write.getCall(0).args[0]

      expect(buffer[0]).to.equal(chipIndex) // chip to send data to
      expect(buffer[1]).to.equal(9) // checksum
      expect(buffer[2]).to.equal(3) // length
      expect(buffer[3]).to.equal(data[0]) // data
      expect(buffer[4]).to.equal(data[1]) // data
      expect(buffer[5]).to.equal(data[2]) // data

      done()
    })
  })

  it('should read bytes from the serial port', function(done) {
    var data = [0x01, 0x02, 0x03]

    var brickPi = new BrickPi()
    brickPi.on('response', function(buffer) {
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
    brickPi.on('response', function(buffer) {
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

  it('should object if read checksum is wrong', function(done) {
    var data = [0x01, 0x02, 0x03]

    var brickPi = new BrickPi()
    brickPi.on('error', function(error) {
      expect(error instanceof Error).to.be.true

      done()
    })

    var checksum = 1

    brickPi._readFromBrickPi([checksum, data.length].concat(data))
  })
})
