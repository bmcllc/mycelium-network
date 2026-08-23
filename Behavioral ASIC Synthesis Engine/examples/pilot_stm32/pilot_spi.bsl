device SPI2 @ 0x40003800 {
  registers {
    CR1 @ 0x00: rw;
    CR2 @ 0x04: rw;
    SR @ 0x08: ro;
    DR @ 0x0c: rw;
  }
  events {
    INIT: write CR1[0] = 68;
    STATUS: read SR[0] = 0;
    XFER: write DR[0] = 85;
  }
  interrupts {
    SPI2_IRQ: level high 36;
  }
  timing {
    xfer: 100ns..2000ns;
  }
  contract {
    must_occur_before: INIT -> STATUS;
    must_occur_before: STATUS -> SPI2_IRQ;
    must_occur_before: XFER -> SPI2_IRQ;
    window: 5us;
  }
}
