var expect = require('chai').expect,
  Utils = require('../lib/Utils')

describe('Utils', function() {

  it('should read bytes from a BitSet', function() {
    var data = "100"

    var bitSet = {
      get: function(index) {
        return data.charAt(index) == "1" ? 1 : 0
      }
    }

    expect(Utils.decodeInt(3, bitSet, 0)).to.equal(4)
  })
})
