
module.exports = {
  // Do one of those funny clock pulses between writing and reading. defined for each device.
  MID: 0x01,

  // The transmit data, and the number of bytes to read and write isn't going to change. defined for each device.
  SAME: 0x02,

  US: {

    // tweak this value
    SPEED: 0x0A,
    IDX: 0x00,
    ADDR: 0x02,
    DATA_REG:  0x42
  }
}
