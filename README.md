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
brickPi.addSensor(new BrickPi.Sensors.Colour(), BrickPi.PORTS.S1)
brickPi.addSensor(new BrickPi.Sensors.Distance(), BrickPi.PORTS.S2)
brickPi.addSensor(new BrickPi.Sensors.Light(), BrickPi.PORTS.S3)
brickPi.addSensor(new BrickPi.Sensors.Touch(), BrickPi.PORTS.S4)

// later
brickPi.sensor(0).value // what colour
brickPi.sensor(1).value // how far
brickPi.sensor(2).value // how much light
brickPi.sensor(3).value // touching something
```

### Motors

```javascript
brickPi.addMotor(new BrickPi.Motor(), BrickPi.MOTOR_PORTS.MA)

// later
brickPi.motor(BrickPi.PORTS.MA).speed(255) // full speed ahead
brickPi.motor(BrickPi.PORTS.MA).speed(0) // stop
brickPi.motor(BrickPi.PORTS.MA).speed(-255) // reverse
brickPi.motor(BrickPi.PORTS.MA).value // actual speed
```
