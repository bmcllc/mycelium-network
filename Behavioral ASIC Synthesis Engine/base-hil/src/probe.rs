/// RP2350 Probe Firmware Template — gera **esqueleto** Rust (não certificado / não CI-cross).
///
/// EXPERIMENTAL: o texto gerado documenta a intenção PIO+USB; não é compilado
/// no workspace default (falta target embutido e HAL).
pub struct ProbeFirmware;

impl ProbeFirmware {
    pub fn generate() -> String {
        let mut code = String::new();
        code.push_str("// B.A.S.E. HIL Probe Firmware — RP2350 [EXPERIMENTAL stub]\n");
        code.push_str("// NÃO é firmware de produção. NÃO flashear sem revisão + probe Detected.\n");
        code.push_str("// Captura paralela via PIO → USB (esqueleto).\n\n");
        code.push_str("#![no_std]\n");
        code.push_str("#![no_main]\n\n");
        code.push_str("use rp235x_hal as hal;\n");
        code.push_str("use hal::pac;\n");
        code.push_str("use usb_device::{prelude::*, class::UsbClass};\n");
        code.push_str("use usbd_serial::SerialPort;\n\n");

        code.push_str("// ─── PIO Program: Bus Capture ─────────────────\n");
        code.push_str("#[hal::entry]\n");
        code.push_str("fn main() -> ! {\n");
        code.push_str("    let mut pac = pac::Peripherals::take().unwrap();\n");
        code.push_str("    let mut pio = pac.PIO0;\n");
        code.push_str("    let sm = 0;\n\n");

        code.push_str("    // Configurar PIO para captura paralela de 8 bits\n");
        code.push_str("    // Programa PIO:\n");
        code.push_str("    // 1. Aguarda borda de clock no pino WR_STROBE\n");
        code.push_str("    // 2. Lê 8 bits de dados\n");
        code.push_str("    // 3. Envia para FIFO TX\n");
        code.push_str("    let pio_program = &[\n");
        code.push_str("        0x80A0_0000, // pull block\n");
        code.push_str("        0x6000_0001, // out pins, 1\n");
        code.push_str("        0x4020_0001, // in pins, 1\n");
        code.push_str("        0xE000_0001, // push block\n");
        code.push_str("    ];\n\n");

        code.push_str("    // ─── Inicializar USB ───────────────────────\n");
        code.push_str("    let usb_bus = UsbBus::new(pac.USBCTRL_REGS);\n");
        code.push_str("    let mut serial = SerialPort::new(&usb_bus);\n");
        code.push_str("    let mut usb_dev = UsbDeviceBuilder::new(&usb_bus, UsbVidPid(0xCAFE, 0x4007))\n");
        code.push_str("        .manufacturer(\"B.A.S.E.\")\n");
        code.push_str("        .product(\"HIL Probe\")\n");
        code.push_str("        .serial_number(\"0001\")\n");
        code.push_str("        .build();\n\n");

        code.push_str("    // ─── Loop Principal de Captura ────────────\n");
        code.push_str("    let mut buf = [0u8; 64];\n");
        code.push_str("    let mut idx = 0;\n\n");

        code.push_str("    loop {\n");
        code.push_str("        // Descarrega FIFO do PIO\n");
        code.push_str("        while !pio.sm_is_rx_fifo_empty(sm) {\n");
        code.push_str("            let sample = pio.sm_get(sm);\n");
        code.push_str("            let timestamp = timer.get_counter().ticks();\n\n");

        code.push_str("            // Formato: [timestamp: u32] [address: u16] [data: u8] [flags: u8]\n");
        code.push_str("            let ts_bytes = timestamp.to_le_bytes();\n");
        code.push_str("            let data_byte = (sample & 0xFF) as u8;\n");
        code.push_str("            let addr_byte = ((sample >> 8) & 0xFFFF) as u16;\n\n");

        code.push_str("            if idx + 8 <= buf.len() {\n");
        code.push_str("                buf[idx..idx+4].copy_from_slice(&ts_bytes);\n");
        code.push_str("                buf[idx+4..idx+6].copy_from_slice(&addr_byte.to_le_bytes());\n");
        code.push_str("                buf[idx+6] = data_byte;\n");
        code.push_str("                buf[idx+7] = 0; // flags\n");
        code.push_str("                idx += 8;\n");
        code.push_str("            }\n");
        code.push_str("        }\n\n");

        code.push_str("        // Envia buffer pelo USB\n");
        code.push_str("        if idx > 0 {\n");
        code.push_str("            if usb_dev.poll(&mut [&mut serial]) {\n");
        code.push_str("                serial.write(&buf[..idx]).ok();\n");
        code.push_str("            }\n");
        code.push_str("            idx = 0;\n");
        code.push_str("        }\n\n");

        code.push_str("        // Pequeno delay para evitar busy-loop\n");
        code.push_str("        cortex_m::asm::wfi();\n");
        code.push_str("    }\n");
        code.push_str("}\n");

        code
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_probe_firmware_generation() {
        let fw = ProbeFirmware::generate();
        assert!(fw.contains("RP2350"));
        assert!(fw.contains("EXPERIMENTAL"));
        assert!(fw.contains("PIO"));
        assert!(fw.contains("USB"));
        assert!(fw.contains("HIL Probe"));
        assert!(fw.contains("main"));
    }
}
