var PiPins = require("pi-pins")

LED = function(pin) {
  this._pin = PiPins.connect(pin)
}

LED.prototype.on = function() {
  this._pin.mode('high')
}

LED.prototype.off = function() {
  this._pin.mode('low')
}

module.exports = LED
