
var BrickPi = require(__dirname + '/lib/BrickPi')
BrickPi.Motor = require(__dirname + '/lib/Motor');
BrickPi.Sensors = {
  Colour: require(__dirname + '/lib/ColourSensor'),
  Distance: require(__dirname + '/lib/DistanceSensor'),
  Light: require(__dirname + '/lib/LightSensor'),
  Touch: require(__dirname + '/lib/TouchSensor')
}

module.exports = BrickPi
