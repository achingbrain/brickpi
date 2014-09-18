var expect = require('chai').expect,
  BitArray = require('../lib/BitArray')

describe('BitArray', function() {

  it('should add bits', function() {
    var bitArray = new BitArray()

    bitArray.addBits(1, 0, 12, 0)
    bitArray.addBits(1, 0, 10, 801)

    expect(bitArray.getArray()[1]).to.equal(parseInt("00000000", 2))
    expect(bitArray.getArray()[2]).to.equal(parseInt("00010000", 2))
    expect(bitArray.getArray()[3]).to.equal(parseInt("00110010", 2))
  })

  it('should read bits', function() {
    var bitArray = new BitArray([
      parseInt("00000011", 2),
      parseInt("01000000", 2),
      parseInt("10001000", 2),
      parseInt("01111100", 2)
    ])

    expect(bitArray.getBits(1, 0, 5)).to.equal(0)
    expect(bitArray.getBits(1, 0, 5)).to.equal(2)
    expect(bitArray.getBits(1, 0, 0)).to.equal(0)
    expect(bitArray.getBits(1, 0, 2)).to.equal(2)
    expect(bitArray.getBits(1, 0, 1)).to.equal(0)
    expect(bitArray.getBits(1, 0, 10)).to.equal(996)
  })
})
