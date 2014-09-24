var expect = require('chai').expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire')

describe('SerialPortWrapper', function() {

  var SerialPortWrapper, SerialPort, LED

  before(function() {
    SerialPort = function() {
      this.write = sinon.stub()
      this.flush = sinon.stub()
      this.on = sinon.stub()
    }

    SerialPortWrapper = proxyquire('../lib/SerialPortWrapper', {
      'serialport': {
        SerialPort: SerialPort
      }
    })
  })

  it('should send bytes to the serial port', function(done) {
    var chipIndex = 0
    var command = 0x01
    var data = [0x02, 0x03, 0x04]

    var serialPortWrapper = new SerialPortWrapper()
    serialPortWrapper._serialPort.flush.callsArg(0)
    serialPortWrapper._serialPort.write.callsArg(1)

    serialPortWrapper.write(chipIndex, command, data, function() {
      var buffer = serialPortWrapper._serialPort.write.getCall(0).args[0]

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

    var serialPortWrapper = new SerialPortWrapper()
    serialPortWrapper._serialPort.flush.callsArg(0)
    serialPortWrapper._serialPort.write.callsArg(1)

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    var checksum = data.length + data.reduce(function(a, b) {
      return a + b;
    });

    serialPortWrapper._read([checksum, data.length].concat(data))
  })

  it('should read bytes from the serial port in batches', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()
    serialPortWrapper._serialPort.flush.callsArg(0)
    serialPortWrapper._serialPort.write.callsArg(1)

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    var checksum = data.length + data.reduce(function(a, b) {
      return a + b;
    });

    serialPortWrapper._read([checksum, data.length])
    serialPortWrapper._read(data)
  })

  it('should read bytes from the serial port in really small batches', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()
    serialPortWrapper._serialPort.flush.callsArg(0)
    serialPortWrapper._serialPort.write.callsArg(1)

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    var checksum = data.length + data.reduce(function(a, b) {
      return a + b;
    });

    serialPortWrapper._read([checksum])
    serialPortWrapper._read([data.length])
    serialPortWrapper._read([data[0]])
    serialPortWrapper._read([data[1]])
    serialPortWrapper._read([data[2]])
  })

  it('should object if read checksum is wrong', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()
    serialPortWrapper._serialPort.flush.callsArg(0)
    serialPortWrapper._serialPort.write.callsArg(1)

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(error instanceof Error).to.be.true

      done()
    })

    var checksum = 1

    serialPortWrapper._read([checksum, data.length].concat(data))
  })
})
