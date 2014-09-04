
var BitSet = function() {
 this._value = 0   
}

BitSet.prototype.get = function(index) {
    
}

BitSet.prototype.set = function(index, value) {
    
}

BitSet.prototype.clear = function(start, end) {
    for(var i = start; i < end; i++) {
        this.set(i, 0)
    }
}

BitSet.prototype.toByteArray = function() {
    
}

module.exports = BitSet
