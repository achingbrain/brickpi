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

### Sensors

Valid sensor types are Colour, Distance, Light and Touch. 

```javascript
// add sensors
brickPi.addSensor(new BrickPi.Sensors.Colour(), 0)
brickPi.addSensor(new BrickPi.Sensors.Distance(), 1)
brickPi.addSensor(new BrickPi.Sensors.Light(), 2)
brickPi.addSensor(new BrickPi.Sensors.Touch(), 3)

// later
brickPi.sensor(0).value // what colour
brickPi.sensor(1).value // how far
brickPi.sensor(2).value // how much light
brickPi.sensor(3).value // touching something
```

### Motors

```javascript
brickPi.addMotor(new BrickPi.Motor(), 0)

// later
brickPi.motor(0).speed(255) // full speed ahead
brickPi.motor(0).speed(0) // stop
brickPi.motor(0).speed(-255) // reverse
brickPi.motor(0).value // actual speed
```
