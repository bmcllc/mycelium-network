device TIM2 @ 0x40000000 {
  registers {
    CR1 @ 0x00: rw;
    SR @ 0x10: ro;
    CNT @ 0x24: rw;
    ARR @ 0x2C: rw;
  }
  events {
    ENABLE: write CR1[0] = 1;
    STATUS: read SR[0] = 0;
    PERIOD: write ARR[0] = 1000;
  }
  interrupts {
    TIM2: level high 28;
  }
  timing {
    tick: 100ns..2000ns;
  }
  contract {
    must_occur_before: ENABLE -> STATUS;
    must_occur_before: STATUS -> TIM2;
    must_occur_before: PERIOD -> TIM2;
    window: 5us;
  }
}
