var expect = require('chai').expect,
  sinon = require('sinon'),
  proxyquire = require('proxyquire')

var checksum = function(data) {
  return data.length + data.reduce(function(a, b) {
    return a + b;
  });
}

describe('SerialPortWrapper', function() {

  var SerialPortWrapper, SerialPort, clock

  beforeEach(function() {
    clock = sinon.useFakeTimers()

    SerialPort = function() {
      this.write = sinon.stub()
      this.flush = sinon.stub()
      this.on = sinon.stub()

      this.flush.callsArg(0)
      this.write.callsArg(1)
    }

    SerialPortWrapper = proxyquire('../lib/SerialPortWrapper', {
      'serialport': {
        SerialPort: SerialPort
      }
    })
  })

  afterEach(function() {
    clock.restore()
  })

  it('should send bytes to the serial port', function(done) {
    var chipIndex = 0
    var command = 0x01
    var data = [0x02, 0x03, 0x04]

    var serialPortWrapper = new SerialPortWrapper()

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

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    serialPortWrapper._read([checksum(data), data.length].concat(data))
  })

  it('should read bytes from the serial port in batches', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    serialPortWrapper._read([checksum(data), data.length].concat(data))
    serialPortWrapper._read(data)
  })

  it('should read bytes from the serial port in really small batches', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(buffer[0]).to.equal(data[0])
      expect(buffer[1]).to.equal(data[1])
      expect(buffer[2]).to.equal(data[2])

      done()
    })

    serialPortWrapper._read([checksum(data)])
    serialPortWrapper._read([data.length])
    serialPortWrapper._read([data[0]])
    serialPortWrapper._read([data[1]])
    serialPortWrapper._read([data[2]])
  })

  it('should object if read checksum is wrong', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(error instanceof Error).to.be.true

      done()
    })

    var checksum = 1

    serialPortWrapper._read([checksum, data.length].concat(data))
  })

  it('should time out if response does not arrive in time', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(error).to.be.ok
      expect(error.message).to.contain('timeout')

      done()
    })

    serialPortWrapper._read([checksum(data), data.length].concat([data[0]]))

    clock.tick(serialPortWrapper._readTimeoutMs + 100)
  })

  it('should handle back to back messages', function(done) {
    var data = [0x01, 0x02, 0x03]

    var serialPortWrapper = new SerialPortWrapper()
    var responseCount = 0

    serialPortWrapper.on('_response_1', function(error, buffer) {
      expect(error).to.undefined

      responseCount++

      if(responseCount == 2) {
        done()
      }
    })

    var packet = [checksum(data), data.length].concat(data)
    packet = packet.concat(packet)

    serialPortWrapper._read(packet)
  })
})
