//! NDJSON trace → [`base_core::evidence::EvidenceEntry`].

use base_core::evidence::{EvidenceDb, EvidenceEntry, EvidenceType, IrqPolarity};
use serde::Deserialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TraceSourceError {
    #[error("invalid NDJSON line: {0}")]
    InvalidLine(String),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
}

/// Evento bruto do emulador (QEMU plugin / device / ficheiro).
#[derive(Debug, Clone, Deserialize)]
pub struct TraceEvent {
    pub op: String,
    #[serde(default)]
    pub addr: Option<String>,
    #[serde(default)]
    pub value: Option<String>,
    #[serde(default)]
    pub vector: Option<u8>,
    #[serde(default)]
    pub polarity: Option<String>,
    #[serde(default)]
    pub ts_ns: Option<u64>,
    #[serde(default)]
    pub meta: HashMap<String, String>,
}

fn parse_u64_hex_or_dec(s: &str) -> Result<u64, TraceSourceError> {
    let t = s.trim();
    if let Some(hex) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
        u64::from_str_radix(hex, 16)
            .map_err(|e| TraceSourceError::InvalidLine(format!("addr/value hex: {e}")))
    } else {
        t.parse::<u64>()
            .map_err(|e| TraceSourceError::InvalidLine(format!("addr/value dec: {e}")))
    }
}

fn polarity_from(s: &str) -> IrqPolarity {
    match s.to_ascii_lowercase().as_str() {
        "low" => IrqPolarity::Low,
        "rising" => IrqPolarity::Rising,
        "falling" => IrqPolarity::Falling,
        _ => IrqPolarity::High,
    }
}

/// Uma linha NDJSON → EvidenceEntry (id temporário; caller renumerar).
pub fn parse_ndjson_line(line: &str, id: &str) -> Result<EvidenceEntry, TraceSourceError> {
    let line = line.trim();
    if line.is_empty() {
        return Err(TraceSourceError::InvalidLine("empty".into()));
    }
    let ev: TraceEvent = serde_json::from_str(line)?;
    let mut context = ev.meta.clone();
    if let Some(ts) = ev.ts_ns {
        context.insert("ts_ns".into(), ts.to_string());
    }
    context.insert("source".into(), "specter_live_ndjson".into());

    let evidence_type = match ev.op.to_ascii_lowercase().as_str() {
        "mmio_write" | "write" => {
            let address = parse_u64_hex_or_dec(
                ev.addr
                    .as_deref()
                    .ok_or_else(|| TraceSourceError::InvalidLine("mmio_write needs addr".into()))?,
            )?;
            let value = match ev.value.as_deref() {
                Some(v) => Some(parse_u64_hex_or_dec(v)?),
                None => None,
            };
            EvidenceType::MmioWrite { address, value }
        }
        "mmio_read" | "read" => {
            let address = parse_u64_hex_or_dec(
                ev.addr
                    .as_deref()
                    .ok_or_else(|| TraceSourceError::InvalidLine("mmio_read needs addr".into()))?,
            )?;
            EvidenceType::MmioRead { address }
        }
        "irq" => {
            let vector = ev
                .vector
                .ok_or_else(|| TraceSourceError::InvalidLine("irq needs vector".into()))?;
            let polarity = polarity_from(ev.polarity.as_deref().unwrap_or("high"));
            EvidenceType::Irq { vector, polarity }
        }
        other => {
            return Err(TraceSourceError::InvalidLine(format!("unknown op: {other}")));
        }
    };

    Ok(EvidenceEntry {
        id: id.to_string(),
        evidence_type,
        context,
    })
}

/// Lê NDJSON completo → EvidenceDb.
pub fn ingest_ndjson(reader: impl Read, source: &str) -> Result<EvidenceDb, TraceSourceError> {
    let mut db = EvidenceDb::new(source);
    let buf = BufReader::new(reader);
    let mut i = 0usize;
    for line in buf.lines() {
        let line = line?;
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            continue;
        }
        let entry = parse_ndjson_line(&line, &format!("live_{i}"))?;
        db.add(entry);
        i += 1;
    }
    Ok(db)
}

pub fn ingest_ndjson_path(path: &Path, source: &str) -> Result<EvidenceDb, TraceSourceError> {
    let f = std::fs::File::open(path)?;
    ingest_ndjson(f, source)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_write_read_irq() {
        let w = parse_ndjson_line(
            r#"{"op":"mmio_write","addr":"0x10000000","value":"0x1","ts_ns":10}"#,
            "e0",
        )
        .unwrap();
        assert!(matches!(
            w.evidence_type,
            EvidenceType::MmioWrite {
                address: 0x10000000,
                value: Some(1)
            }
        ));

        let r = parse_ndjson_line(r#"{"op":"mmio_read","addr":"0x10000004"}"#, "e1").unwrap();
        assert!(matches!(
            r.evidence_type,
            EvidenceType::MmioRead { address: 0x10000004 }
        ));

        let irq = parse_ndjson_line(
            r#"{"op":"irq","vector":32,"polarity":"rising"}"#,
            "e2",
        )
        .unwrap();
        assert!(matches!(
            irq.evidence_type,
            EvidenceType::Irq {
                vector: 32,
                polarity: IrqPolarity::Rising
            }
        ));
    }

    #[test]
    fn ingest_multiline() {
        let raw = r#"
{"op":"mmio_write","addr":"0x40034000","value":"0x41"}
{"op":"mmio_read","addr":"0x40034000"}
"#;
        let db = ingest_ndjson(raw.as_bytes(), "test").unwrap();
        assert_eq!(db.count(), 2);
        assert_eq!(db.unique_mmio_addresses(), vec![0x40034000]);
    }
}
