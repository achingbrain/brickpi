
var BitArray = function(array) {
  this._array = Array.isArray(array) ? array : []
  this._bitOffset = 0
}

BitArray.prototype.addBits = function(byteOffset, bitOffset, bits, value) {
  for(var i = 0; i < bits; i++) {
    var index = byteOffset + Math.floor((bitOffset + this._bitOffset + i) / 8)

    if(this._array.length < index) {
      // expand array
      for(var n = this._array.length; n < index; n++) {
        this._array.push(0)
      }
    }

    if(this._array[index] === undefined) {
      this._array[index] = 0
    }

    if(value & 0x01) {
      this._array[index] |= (0x01 << ((bitOffset + this._bitOffset + i) % 8))
    }

    value = value >> 1
  }

  this._bitOffset += bits
}

BitArray.prototype.getBits = function(byteOffset, bitOffset, bits) {
  var result = 0

  for(var i = 0; i < bits; i++) {
    var index = byteOffset + Math.floor((bitOffset + this._bitOffset + i) / 8)
    var position = 7 - ((bitOffset + this._bitOffset + i) % 8)

    result *= 2
    result |= (this._array[index] >> position) & 0x01
  }

  this._bitOffset += bits

  return result
}

BitArray.prototype.getArray = function() {
  return this._array
}

module.exports = BitArray
