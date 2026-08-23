device I2C1 @ 0x40005400 {
  registers {
    CR1 @ 0x00: rw;
    CR2 @ 0x04: rw;
    DR @ 0x10: rw;
    SR1 @ 0x14: ro;
  }
  events {
    INIT: write CR1[0] = 1;
    STATUS: read SR1[0] = 0;
    XFER: write DR[0] = 85;
  }
  interrupts {
    I2C1_EV: level high 31;
  }
  timing {
    xfer: 100ns..2000ns;
  }
  contract {
    must_occur_before: INIT -> STATUS;
    must_occur_before: STATUS -> I2C1_EV;
    must_occur_before: XFER -> I2C1_EV;
    window: 5us;
  }
}
