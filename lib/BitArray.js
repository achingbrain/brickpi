
var BitArray = function(array) {
  this._array = Array.isArray(array) || Buffer.isBuffer(array) ? array : []
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
  console.info("GetBits", byteOffset, bitOffset, bits)
  console.info("this._array", this._array)

  var result = 0

  for(var i = bits; i > 0; i--) {
    var index = byteOffset + Math.floor((bitOffset + this._bitOffset + (i - 1)) / 8)
    var position = (bitOffset + this._bitOffset + (i - 1)) % 8

    result *= 2
    result |= (this._array[index] >> position) & 0x01

    console.info("Index", index, "=", this._array[index], ">>", position, "& 0x01 =", (this._array[index] >> position) & 0x01)
  }

  this._bitOffset += bits

  console.info("result", result)
  return result
}

BitArray.prototype.getArray = function() {
  return this._array
}

module.exports = BitArray
