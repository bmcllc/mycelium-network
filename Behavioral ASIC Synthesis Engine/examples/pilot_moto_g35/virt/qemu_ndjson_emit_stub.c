/* Specter Live — stub de emissão NDJSON para device/plugin QEMU (E2).
 *
 * Compilar contra QEMU tree (não no CI default). Ligar ao MMIO read/write do device
 * gerado pela Camada 9 e fazer fprintf(stderr, ...) ou write(fd, ...).
 *
 * Formato: uma linha JSON por acesso — ver vault 25.10.
 *
 * Honesty: isto NÃO é um SO; só instrumentação de evidência.
 */
#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>

#ifndef BASE_VIRT_TRACE_FILE
/* NULL → stderr; senão path aberto em append pelo caller */
static FILE *base_virt_trace_fp;
#endif

static void base_virt_emit_mmio_write(uint64_t addr, uint64_t value, uint64_t ts_ns) {
    FILE *fp = base_virt_trace_fp ? base_virt_trace_fp : stderr;
    fprintf(fp,
            "{\"op\":\"mmio_write\",\"addr\":\"0x%" PRIx64 "\",\"value\":\"0x%" PRIx64
            "\",\"ts_ns\":%" PRIu64 "}\n",
            addr, value, ts_ns);
    fflush(fp);
}

static void base_virt_emit_mmio_read(uint64_t addr, uint64_t ts_ns) {
    FILE *fp = base_virt_trace_fp ? base_virt_trace_fp : stderr;
    fprintf(fp,
            "{\"op\":\"mmio_read\",\"addr\":\"0x%" PRIx64 "\",\"ts_ns\":%" PRIu64 "}\n",
            addr, ts_ns);
    fflush(fp);
}

static void base_virt_emit_irq(uint8_t vector, const char *polarity, uint64_t ts_ns) {
    FILE *fp = base_virt_trace_fp ? base_virt_trace_fp : stderr;
    fprintf(fp,
            "{\"op\":\"irq\",\"vector\":%u,\"polarity\":\"%s\",\"ts_ns\":%" PRIu64 "}\n",
            (unsigned)vector, polarity ? polarity : "rising", ts_ns);
    fflush(fp);
}

/* Exemplo de uso no read/write do SysBusDevice:
 *   base_virt_emit_mmio_write(s->mmio.addr + offset, val, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL));
 */
