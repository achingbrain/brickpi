
var Utils = {
  decodeInt: function(bitLength, incoming, startingBitLocation) {
    var value = 0;

    for(var i = 0; i < bitLength; i++) {
      value <<= 1
      value |= incoming.get(startingBitLocation) ? 1 : 0

      startingBitLocation++
    }

    return value
  }
}

module.exports = Utils
