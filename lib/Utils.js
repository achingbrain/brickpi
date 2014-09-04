
var Utils = {
  decodeInt: function(bitLength, incoming, startingBitLocation) {
    var value = 0;

    while (bitLength-- > 0) {
      value <<= 1
      var location = bitLength + startingBitLocation
      var val = ((incoming[location / 8] & (1 << (location % 8))) != 0)
      if (val) {
        value |= 1
      }
    }

    return value
  }
}

module.exports = Utils