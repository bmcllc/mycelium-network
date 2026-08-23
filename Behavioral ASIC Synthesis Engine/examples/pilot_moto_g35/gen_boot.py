#!/usr/bin/env python3
"""Generate synthetic ANDROID! boot.img + kernel payload for Moto G35 pilot.

Kernel (AArch64 LE) touches Unisoc-range UART page 0xA9000000 (synth AP_UART0).
Header: 1648 bytes ANDROID! so base-cli strip_headers lands on payload.

  python3 examples/pilot_moto_g35/gen_boot.py
"""
from __future__ import annotations

import json
import pathlib
import struct

UART = 0xA9000000
ANDROID_HDR = 1648


def u32(x: int) -> bytes:
    return struct.pack("<I", x & 0xFFFFFFFF)


def adrp(rd: int, imm: int) -> bytes:
    page = imm >> 12
    immlo = page & 0x3
    immhi = (page >> 2) & 0x7FFFF
    enc = (1 << 31) | (immlo << 29) | (0b10000 << 24) | (immhi << 5) | rd
    return u32(enc)


def movz_w(rd: int, imm16: int) -> bytes:
    return u32(0x52800000 | ((imm16 & 0xFFFF) << 5) | rd)


def str_w_imm(rt: int, rn: int, offset: int) -> bytes:
    imm12 = offset // 4
    return u32(0xB9000000 | ((imm12 & 0xFFF) << 10) | (rn << 5) | rt)


def ldr_w_imm(rt: int, rn: int, offset: int) -> bytes:
    imm12 = offset // 4
    return u32(0xB9400000 | ((imm12 & 0xFFF) << 10) | (rn << 5) | rt)


def ret() -> bytes:
    return u32(0xD65F03C0)


KERNEL = b"".join(
    [
        adrp(0, UART),
        movz_w(1, 1),
        str_w_imm(1, 0, 0),
        ldr_w_imm(2, 0, 4),
        movz_w(1, 0x41),
        str_w_imm(1, 0, 0),
        ret(),
    ]
)

HERE = pathlib.Path(__file__).resolve().parent


def main() -> None:
    hdr = bytearray(ANDROID_HDR)
    hdr[0:8] = b"ANDROID!"
    # minimal v0-ish: kernel size at offset 8
    struct.pack_into("<I", hdr, 8, len(KERNEL))
    boot = bytes(hdr) + KERNEL
    (HERE / "boot.img").write_bytes(boot)
    (HERE / "kernel.bin").write_bytes(KERNEL)

    mmio = [
        {
            "address": UART,
            "value": 1,
            "access_type": "write",
            "function_name": "ap_uart_init",
            "instruction_addr": 0,
        },
        {
            "address": UART + 4,
            "value": None,
            "access_type": "read",
            "function_name": "ap_uart_status",
            "instruction_addr": 4,
        },
        {
            "address": UART,
            "value": 65,
            "access_type": "write",
            "function_name": "ap_uart_putc",
            "instruction_addr": 8,
        },
    ]
    (HERE / "mmio.json").write_text(json.dumps(mmio, indent=2) + "\n")
    print(f"wrote boot.img ({len(boot)} B) kernel.bin ({len(KERNEL)} B) mmio.json")
    print(f"UART_page=0x{UART:08x} ANDROID_HDR={ANDROID_HDR}")


if __name__ == "__main__":
    main()
