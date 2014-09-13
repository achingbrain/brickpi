
var Utils = {
  decodeInt: function(bitLength, incoming, startingBitLocation) {
    var value = 0;
    
    for(var i = 0; i < bitLength; i++) {
      value <<= 1

      value &= incoming.get(startingBitLocation) ? 1 : 0

      startingBitLocation++
    }
/*
    while (bitLength-- > 0) {
      value <<= 1

      var location = bitLength + startingBitLocation
      var val = ((incoming.get(location / 8) & (1 << (location % 8))) !== 0)

      if (val) {
        value |= 1
      }
    }
*/
    return value
  }
}

module.exports = Utils