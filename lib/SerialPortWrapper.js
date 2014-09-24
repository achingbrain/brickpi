var SerialPort = require('serialport').SerialPort,
  EventEmitter = require('events').EventEmitter,
  util = require('util'),
  LOG = require('winston')

/**
 * Handles low level serial port interactions - retries, checksums, etc
 */
var SerialPortWrapper = function(port, options) {
  EventEmitter.call(this)

  this._reading = null
  this._readLength = null
  this._readChecksum = null
  this._readBuffer = null
  this._readBufferOffset = null
  this._readTimeout = null
  this._readChecksumData = null

  this._serialPort = new SerialPort(port, options)
  this._serialPort.on('open', this.emit.bind(this, 'ready'))
  this._serialPort.on('data', this._read.bind(this))
}
util.inherits(SerialPortWrapper, EventEmitter)

SerialPortWrapper.prototype.write = function(chipIndex, command, packet, callback) {
  var retries = 5
  var retryHandler = function(error) {
    if(error && retries > 0) {
        retries--
        LOG.warn('Retrying communication with BrickPi.')
        return this._send(chipIndex, command, packet, handler)
    }

    if(callback) {
      callback(error)
    }
  }.bind(this)

  this.once('_response_' + (command  & 0xFF), callback)
  this._write(chipIndex, command, packet, retryHandler, callback)
}

SerialPortWrapper.prototype._write = function(destinationAddress, command, data, retryHandler) {
  var packet = new Buffer(data.length + 4)

  // clear the read buffer before writing...
  this._serialPort.flush(function(error) {
    if(error) return callback(error)

    // + 1 for the command byte
    var dataLength = data.length + 1

    // the checksum is the sum of all the bytes in the entire packet EXCEPT the checksum
    var checksum = destinationAddress + command + dataLength + Array.prototype.reduce.call(data, function(a, b, index) {
      packet[index + 4] = b & 0xFF
      return a + (b & 0xFF)
    }, 0);

    packet[0] = destinationAddress & 0xFF
    packet[1] = checksum & 0xFF
    packet[2] = dataLength
    packet[3] = command & 0xFF

    this._serialPort.write(new Buffer(packet), retryHandler)
  }.bind(this))
}

SerialPortWrapper.prototype._read = function(data) {
  LOG.debug('incoming', data)

  var offset = 0

  if(!this._reading) {
    if(this._readChecksum === null && data.length > offset) {
        // we are starting a new read
        // the first byte of the received packet in the checksum.
        // the second is the number of bytes in the packet.
        this._readChecksum = data[offset]
        offset++

        LOG.debug('checksum', this._readChecksum)
    }

    if(this._readLength === null && data.length > offset) {
        // the packet size does not include this two byte header.
        this._readLength = data[offset]
        this._readChecksumData = this._readLength
        offset++

        LOG.debug('expecting', this._readLength)

        this._readBuffer = new Buffer(this._readLength)
        this._readBufferOffset = 0

        this._reading = true
        this._readTimeout = setTimeout(function() {
          this.emit('error', new Error('Read timeout'))
        }.bind(this), 5000)
    }
  }

  LOG.debug('offset', offset, 'data.length', data.length)

  for(var i = offset; i < data.length; i++) {
    this._readChecksumData += data[i]
    LOG.debug('adding', data[i], 'at', this._readBufferOffset)
    this._readBuffer[this._readBufferOffset] = data[i]
    this._readBufferOffset++
  }

  LOG.debug('read buffer', this._readBuffer)
  LOG.debug('read buffer offset', this._readBufferOffset, 'length', this._readBuffer ? this._readBuffer.length : 'n/a')

  if(this._readBuffer && this._readBuffer.length == this._readBufferOffset) {
    // done reading response
    clearTimeout(this._readTimeout)

    this._reading = false

    var error = undefined;

    if((this._readChecksumData & 0xFF) != this._readChecksum) {
      //LOG.debug('this._readChecksumData & 0xFF =', this._readChecksumData, (this._readChecksumData & 0xFF), 'this._readChecksum =', this._readChecksum, 'this._readBuffer', this._readBuffer)

      error = new Error('Checksum failed!')
    }

    LOG.debug('----------')

    this._readChecksum = null
    this._readLength = null

    this.emit('_response_' + this._readBuffer[0], error, this._readBuffer)
  }
}

module.exports = SerialPortWrapper
