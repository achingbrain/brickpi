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

  it('should read first bit', function() {
    var bitArray = new BitArray([
      parseInt("10000000", 2)
    ])

    expect(bitArray.getBits(0, 0, 1)).to.equal(1)
  })

  it('should read bits accross byte boundaries', function() {
    var bitArray = new BitArray([
      parseInt("00000001", 2),
      parseInt("10000000", 2)
    ])

    expect(bitArray.getBits(0, 7, 2)).to.equal(3)
  })

  it('should move the read pointer when called repeatedly', function() {
    var bitArray = new BitArray([
      parseInt("10100000", 2)
    ])

    expect(bitArray.getBits(0, 0, 1)).to.equal(1)
    expect(bitArray.getBits(0, 0, 1)).to.equal(0)
    expect(bitArray.getBits(0, 0, 1)).to.equal(1)
  })

  it('should read bits with byte offsets', function() {
    var bitArray = new BitArray([
      parseInt("00000000", 2),
      parseInt("10000000", 2)
    ])

    expect(bitArray.getBits(1, 0, 1)).to.equal(1)
  })
})
