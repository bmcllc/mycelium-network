device USART1 @ 0x40013800 {
  registers {
    SR @ 0x00: ro;
    DR @ 0x04: rw;
    BRR @ 0x08: rw;
    CR1 @ 0x0c: rw;
  }
  events {
    INIT: write CR1[0] = 8196;
    STATUS: read SR[0] = 0;
    TX: write DR[0] = 65;
  }
  interrupts {
    USART1_IRQ: level high 37;
  }
  timing {
    char: 100ns..2000ns;
  }
  contract {
    must_occur_before: INIT -> STATUS;
    must_occur_before: STATUS -> USART1_IRQ;
    must_occur_before: TX -> USART1_IRQ;
    window: 5us;
  }
}
