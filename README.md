# node-brickpi

Node.js bindings for the [BrickPi](http://www.dexterindustries.com/BrickPi).

## Usage

```javascript
var BrickPi = require('brickpi')

var brickPi = new BrickPi('/dev/ttyAMA0', function() {
  brickPi.led(0).on()
})
```

### LED

The BrickPi has two LEDs that can be accessed by passing an index to the `led` function:

```javascript
var led1 = brickPi.led(0)
var led2 = brickPi.led(1)
```

An LED supports several methods:

```javascript
brickPi.led(0).on() // turn the LED on
brickPi.led(0).off() // turn the LED off
brickPi.led(0).toggle() // if the LED is on, turn it off, otherwise turn it on
```
