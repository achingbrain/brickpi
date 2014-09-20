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

### Notes

#### What about EV3, NXT2, etc?

I only have the NXT kit, sorry.  Hardware donations and/or pull requests gratefully accepted.

#### Why is the motor control so imprecise?

NXT motors are continuous servos equipped with encoders. This means that you tell the motor how fast to spin then read
the encoders to work out what position the motor is in. Once it reaches the desired location, you stop the motor.
Because the motor is a mechanical device stopping it involves it slowing down before stopping completely by which point
it will most likely be slightly past the desired location.  Normal servos do not have this problem because the PWM
duty cycle set corresponds to a given orientation of the servo horn.

#### What about sensor port 5?

The second generation BrickPi has five sensor ports.  This driver has been ported from the Python version which 
doesn't support the fifth sensor port.  If a driver that does support it emerges I can add support.
