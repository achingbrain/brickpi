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

### Motors

```javascript
var motor = brickPi.addMotor(new BrickPi.Motor(), BrickPi.PORTS.MA)

// later
motor.speed(255) // full speed ahead
motor.speed(0) // stop
motor.speed(-255) // reverse

brickPi.once('emergencyStop', function() {
    console.info('stopped!')
})
brickPi.emergencyStop() // immediately stop all motors
```

### Sensors

Valid sensor types are Distance, Light, Sound and Touch. 

```javascript
// add sensors
var distance = brickPi.addSensor(new BrickPi.Sensors.NXT.Distance(), BrickPi.PORTS.S1)
var light = brickPi.addSensor(new BrickPi.Sensors.NXT.Light(), BrickPi.PORTS.S2)
var sound = brickPi.addSensor(new BrickPi.Sensors.NXT.Sound(), BrickPi.PORTS.S3)
var touch = brickPi.addSensor(new BrickPi.Sensors.NXT.Touch(), BrickPi.PORTS.S4)

// later
distance.value(function(error, value) {
    // value is 0-255 in cm
}) 
light.value(function(error, value) {
  // value is 0-100 in %
})
sound.value(function(error, value) {
  // value is 0-100 in %
})
touch.value(function(error, value) {
  // value is true or false
})
```

### Missing stuff

#### What about EV3, NXT2, etc?

I only have the NXT kit, sorry.  Hardware donations and/or pull requests gratefully accepted.
