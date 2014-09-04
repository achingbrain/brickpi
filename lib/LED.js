var PiPins = require("pi-pins")

LED = function(pin) {
  this._pin = PiPins.connect(pin)
  this.off()
  this._on = false
}

LED.prototype.on = function() {
  this._pin.mode('high')
  this._on = true
}

LED.prototype.off = function() {
  this._pin.mode('low')
  this._on = false
}

LED.prototype.toggle = function() {
  this._pin.mode('low')

  if(this._on) {
      this.off()
  } else {
      this.on()
  }
}

module.exports = LED
