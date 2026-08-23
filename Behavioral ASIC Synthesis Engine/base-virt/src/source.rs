//! TraceSource adapters — QEMU NDJSON · MAME · Libretro/RetroArch.
//!
//! Honesty: parsers de texto → EvidenceDb; ≠ emulador embutido / ≠ cores shipados.

use crate::trace::{ingest_ndjson, parse_ndjson_line, TraceSourceError};
use base_core::evidence::{EvidenceDb, EvidenceEntry, EvidenceType, IrqPolarity};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::str::FromStr;

/// Formato de entrada para ingestão Specter Live.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TraceFormat {
    Ndjson,
    /// Linhas MAME/Lua: `W 0xA00000 0x12` · `R 0xA00000` · `Write …` / `Read …`
    Mame,
    /// Libretro / RetroArch mem watch: `mem_write 0x7E0010 0xFF` · `W addr val`
    Libretro,
    /// Auto: `.ndjson` / linha `{` → Ndjson; senão tenta Mame depois Libretro.
    Auto,
}

impl FromStr for TraceFormat {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_ascii_lowercase().as_str() {
            "ndjson" | "jsonl" | "qemu" => Ok(Self::Ndjson),
            "mame" | "arcade" => Ok(Self::Mame),
            "libretro" | "retroarch" | "ra" => Ok(Self::Libretro),
            "auto" => Ok(Self::Auto),
            other => Err(format!("unknown format '{other}' (ndjson|mame|libretro|auto)")),
        }
    }
}

impl TraceFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ndjson => "ndjson",
            Self::Mame => "mame",
            Self::Libretro => "libretro",
            Self::Auto => "auto",
        }
    }
}

/// Fonte de evidência comportamental (mesmo algoritmo Specter Live).
pub trait TraceSource {
    fn name(&self) -> &str;
    fn ingest(&self) -> Result<EvidenceDb, TraceSourceError>;
}

pub struct NdjsonSource<'a> {
    pub label: &'a str,
    pub data: &'a [u8],
}

impl TraceSource for NdjsonSource<'_> {
    fn name(&self) -> &str {
        self.label
    }
    fn ingest(&self) -> Result<EvidenceDb, TraceSourceError> {
        ingest_ndjson(self.data, self.label)
    }
}

pub struct MameSource<'a> {
    pub label: &'a str,
    pub data: &'a [u8],
}

impl TraceSource for MameSource<'_> {
    fn name(&self) -> &str {
        self.label
    }
    fn ingest(&self) -> Result<EvidenceDb, TraceSourceError> {
        ingest_mame(self.data, self.label)
    }
}

pub struct LibretroSource<'a> {
    pub label: &'a str,
    pub data: &'a [u8],
}

impl TraceSource for LibretroSource<'_> {
    fn name(&self) -> &str {
        self.label
    }
    fn ingest(&self) -> Result<EvidenceDb, TraceSourceError> {
        ingest_libretro(self.data, self.label)
    }
}

fn parse_hex_token(s: &str) -> Result<u64, TraceSourceError> {
    let t = s.trim().trim_end_matches(',');
    let t = t.strip_prefix('$').unwrap_or(t);
    if let Some(hex) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
        u64::from_str_radix(hex, 16)
            .map_err(|e| TraceSourceError::InvalidLine(format!("hex: {e}")))
    } else if t.chars().all(|c| c.is_ascii_hexdigit()) && t.len() >= 2 {
        u64::from_str_radix(t, 16)
            .map_err(|e| TraceSourceError::InvalidLine(format!("hex: {e}")))
    } else {
        t.parse::<u64>()
            .map_err(|e| TraceSourceError::InvalidLine(format!("int: {e}")))
    }
}

fn push_entry(db: &mut EvidenceDb, id: usize, ty: EvidenceType, backend: &str) {
    let mut context = HashMap::new();
    context.insert("source".into(), backend.into());
    db.add(EvidenceEntry {
        id: format!("live_{id}"),
        evidence_type: ty,
        context,
    });
}

/// Parser MAME-style (debugger / Lua hooks export).
pub fn ingest_mame(reader: impl Read, source: &str) -> Result<EvidenceDb, TraceSourceError> {
    let mut db = EvidenceDb::new(source);
    let mut i = 0usize;
    for line in BufReader::new(reader).lines() {
        let line = line?;
        let t = line.trim();
        if t.is_empty() || t.starts_with('#') || t.starts_with("//") {
            continue;
        }
        // NDJSON passthrough if someone mixed formats
        if t.starts_with('{') {
            let e = parse_ndjson_line(t, &format!("live_{i}"))?;
            db.add(e);
            i += 1;
            continue;
        }
        let lower = t.to_ascii_lowercase();
        let parts: Vec<&str> = t.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }
        let op0 = parts[0].to_ascii_lowercase();

        // Write 0xA00000 = 0x12
        if (op0 == "w" || op0 == "write") && lower.contains('=') {
            let cleaned = t.replace('=', " ");
            let p: Vec<&str> = cleaned.split_whitespace().collect();
            if p.len() >= 3 {
                let addr = parse_hex_token(p[1])?;
                let val = parse_hex_token(p[2])?;
                push_entry(
                    &mut db,
                    i,
                    EvidenceType::MmioWrite {
                        address: addr,
                        value: Some(val),
                    },
                    "mame",
                );
                i += 1;
            }
            continue;
        }

        let (is_write, addr_i, val_i) = if op0 == "w" || op0 == "write" {
            if parts.len() >= 3 {
                (true, 1usize, Some(2usize))
            } else {
                continue;
            }
        } else if op0 == "r" || op0 == "read" {
            if parts.len() >= 2 {
                (false, 1, None)
            } else {
                continue;
            }
        } else if op0 == "irq" && parts.len() >= 2 {
            let vector = parts[1]
                .parse::<u8>()
                .map_err(|e| TraceSourceError::InvalidLine(format!("irq: {e}")))?;
            push_entry(
                &mut db,
                i,
                EvidenceType::Irq {
                    vector,
                    polarity: IrqPolarity::Rising,
                },
                "mame",
            );
            i += 1;
            continue;
        } else {
            continue;
        };

        let addr = parse_hex_token(parts[addr_i])?;
        if is_write {
            let value = val_i.map(|vi| parse_hex_token(parts[vi])).transpose()?;
            push_entry(
                &mut db,
                i,
                EvidenceType::MmioWrite { address: addr, value },
                "mame",
            );
        } else {
            push_entry(
                &mut db,
                i,
                EvidenceType::MmioRead { address: addr },
                "mame",
            );
        }
        i += 1;
    }
    Ok(db)
}

/// Parser Libretro / RetroArch mem-watch style.
pub fn ingest_libretro(reader: impl Read, source: &str) -> Result<EvidenceDb, TraceSourceError> {
    let mut db = EvidenceDb::new(source);
    let mut i = 0usize;
    for line in BufReader::new(reader).lines() {
        let line = line?;
        let t = line.trim();
        if t.is_empty() || t.starts_with('#') {
            continue;
        }
        if t.starts_with('{') {
            let e = parse_ndjson_line(t, &format!("live_{i}"))?;
            db.add(e);
            i += 1;
            continue;
        }
        let parts: Vec<&str> = t.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }
        let op = parts[0].to_ascii_lowercase();
        match op.as_str() {
            "mem_write" | "write" | "w" => {
                if parts.len() < 3 {
                    continue;
                }
                let addr = parse_hex_token(parts[1])?;
                let value = parse_hex_token(parts[2])?;
                push_entry(
                    &mut db,
                    i,
                    EvidenceType::MmioWrite {
                        address: addr,
                        value: Some(value),
                    },
                    "libretro",
                );
                i += 1;
            }
            "mem_read" | "read" | "r" => {
                let addr = parse_hex_token(parts[1])?;
                push_entry(
                    &mut db,
                    i,
                    EvidenceType::MmioRead { address: addr },
                    "libretro",
                );
                i += 1;
            }
            _ => {}
        }
    }
    Ok(db)
}

pub fn ingest_with_format(
    data: &[u8],
    source: &str,
    format: TraceFormat,
) -> Result<EvidenceDb, TraceSourceError> {
    match format {
        TraceFormat::Ndjson => NdjsonSource {
            label: source,
            data,
        }
        .ingest(),
        TraceFormat::Mame => MameSource {
            label: source,
            data,
        }
        .ingest(),
        TraceFormat::Libretro => LibretroSource {
            label: source,
            data,
        }
        .ingest(),
        TraceFormat::Auto => {
            let trimmed = std::str::from_utf8(data).unwrap_or("").trim_start();
            if trimmed.starts_with('{') {
                return ingest_ndjson(data, source);
            }
            let mame = ingest_mame(data, source)?;
            if mame.count() > 0 {
                return Ok(mame);
            }
            ingest_libretro(data, source)
        }
    }
}

pub fn ingest_path_with_format(
    path: &Path,
    format: TraceFormat,
) -> Result<EvidenceDb, TraceSourceError> {
    let data = std::fs::read(path)?;
    let label = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("trace");
    let fmt = if format == TraceFormat::Auto {
        match path.extension().and_then(|e| e.to_str()) {
            Some("ndjson") | Some("jsonl") => TraceFormat::Ndjson,
            Some("mame") => TraceFormat::Mame,
            Some("libretro") | Some("ra") => TraceFormat::Libretro,
            _ => TraceFormat::Auto,
        }
    } else {
        format
    };
    ingest_with_format(&data, label, fmt)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mame_write_read() {
        let raw = b"W 0xA00000 0x12\nR 0xA00000\nWrite 0xB00000 = 0x34\n";
        let db = ingest_mame(&raw[..], "mame").unwrap();
        assert_eq!(db.count(), 3);
        assert!(db.unique_mmio_addresses().contains(&0xA00000));
    }

    #[test]
    fn libretro_mem() {
        let raw = b"mem_write 0x7E0010 0xFF\nmem_read 0x7E0010\n";
        let db = ingest_libretro(&raw[..], "ra").unwrap();
        assert_eq!(db.count(), 2);
    }

    #[test]
    fn auto_ndjson() {
        let raw = br#"{"op":"mmio_read","addr":"0x1000"}
"#;
        let db = ingest_with_format(raw, "t", TraceFormat::Auto).unwrap();
        assert_eq!(db.count(), 1);
    }
}
