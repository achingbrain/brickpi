var SerialPort = require('serialport').SerialPort,
  LED = require('./LED')

var BrickPi = function(port, options, callback) {
  if(options instanceof Function) {
    callback = options
    options = {
      baudrate: 57600
    }
  }

  this._leds = [
    new LED(18),
    new LED(17)
  ]

  this._leds.forEach(function(led) {
    led.off()
  })

  this._serialPort = new SerialPort(port, options)
  this._serialPort.on('open', callback)
}

BrickPi.prototype.led = function(index) {
  return this._leds[index]
}

module.exports = BrickPi
