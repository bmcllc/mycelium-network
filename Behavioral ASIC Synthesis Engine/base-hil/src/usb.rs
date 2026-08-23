//! Enumerate USB opt-in — feature `hil_usb` (rusb). Default build: sempre `false`.
//!
//! Catálogo de probes de lab (ST-Link, DAPLink, Pico, …) para path **live** sem mock.

/// Probes USB comuns em lab HIL (VID, PID, nome).
pub const KNOWN_LAB_PROBES: &[(u16, u16, &str)] = &[
    // Stub B.A.S.E. (firmware gerado — raro em USB real)
    (0xCAFE, 0x4007, "BASE stub RP2350"),
    // ST-Link
    (0x0483, 0x3748, "ST-Link/V2"),
    (0x0483, 0x374b, "ST-Link/V2-1"),
    (0x0483, 0x3752, "ST-Link/V3"),
    // CMSIS-DAP / DAPLink
    (0x0D28, 0x0204, "DAPLink CMSIS-DAP"),
    // Raspberry Pi Pico (BOOTSEL / picotool)
    (0x2E8A, 0x0003, "RPi Pico BOOTSEL"),
    (0x2E8A, 0x0005, "RPi Pico Probe"),
    // Segger J-Link (comum)
    (0x1366, 0x0101, "J-Link"),
    (0x1366, 0x0105, "J-Link"),
];

/// Env: lista extra `vid:pid,vid:pid` (hex) para o lab do Cliente.
pub const ENV_PROBE_IDS: &str = "BASE_HIL_PROBE_IDS";

/// Retorna true se existir dispositivo USB com VID:PID.
#[cfg(feature = "hil_usb")]
pub(crate) fn usb_device_present(vid: u16, pid: u16) -> bool {
    match rusb::devices() {
        Ok(list) => {
            let found = list.iter().any(|dev| {
                dev.device_descriptor()
                    .map(|d| d.vendor_id() == vid && d.product_id() == pid)
                    .unwrap_or(false)
            });
            if found {
                tracing::info!(
                    "[HIL] USB device {:04x}:{:04x} present (hil_usb)",
                    vid,
                    pid
                );
            } else {
                tracing::debug!(
                    "[HIL] USB scan: {:04x}:{:04x} not found",
                    vid,
                    pid
                );
            }
            found
        }
        Err(e) => {
            tracing::warn!(
                "[HIL] USB enumerate failed ({e}) — treating as Simulated"
            );
            false
        }
    }
}

#[cfg(not(feature = "hil_usb"))]
pub(crate) fn usb_device_present(_vid: u16, _pid: u16) -> bool {
    false
}

/// Parse `BASE_HIL_PROBE_IDS` → pares (vid, pid).
pub fn extra_probe_ids_from_env() -> Vec<(u16, u16)> {
    let Ok(raw) = std::env::var(ENV_PROBE_IDS) else {
        return Vec::new();
    };
    raw.split(',')
        .filter_map(|tok| {
            let t = tok.trim();
            if t.is_empty() {
                return None;
            }
            let (v, p) = t.split_once(':')?;
            let vid = u16::from_str_radix(v.trim().trim_start_matches("0x").trim_start_matches("0X"), 16).ok()?;
            let pid = u16::from_str_radix(p.trim().trim_start_matches("0x").trim_start_matches("0X"), 16).ok()?;
            Some((vid, pid))
        })
        .collect()
}

/// Primeiro probe USB encontrado: preferred → env extra → catálogo conhecido.
/// Retorna `(vid, pid, label)` ou `None`.
pub fn find_present_probe(preferred_vid: u16, preferred_pid: u16) -> Option<(u16, u16, &'static str)> {
    if usb_device_present(preferred_vid, preferred_pid) {
        let label = KNOWN_LAB_PROBES
            .iter()
            .find(|(v, p, _)| *v == preferred_vid && *p == preferred_pid)
            .map(|(_, _, n)| *n)
            .unwrap_or("preferred");
        return Some((preferred_vid, preferred_pid, label));
    }
    for (vid, pid) in extra_probe_ids_from_env() {
        if usb_device_present(vid, pid) {
            return Some((vid, pid, "BASE_HIL_PROBE_IDS"));
        }
    }
    for &(vid, pid, name) in KNOWN_LAB_PROBES {
        if vid == preferred_vid && pid == preferred_pid {
            continue; // already checked
        }
        if usb_device_present(vid, pid) {
            return Some((vid, pid, name));
        }
    }
    None
}

/// Feature `hil_usb` compilada?
pub fn usb_feature_enabled() -> bool {
    cfg!(feature = "hil_usb")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn without_device_returns_bool() {
        let _ = usb_device_present(0xCAFE, 0x4007);
    }

    #[cfg(not(feature = "hil_usb"))]
    #[test]
    fn default_build_never_claims_usb() {
        assert!(!usb_device_present(0xCAFE, 0x4007));
        assert!(!usb_device_present(0x0000, 0x0000));
        assert!(find_present_probe(0xCAFE, 0x4007).is_none());
    }

    #[test]
    fn known_catalog_non_empty() {
        assert!(!KNOWN_LAB_PROBES.is_empty());
    }
}
