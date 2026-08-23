/// Dataset para treinamento de modelos de ML.
///
/// Gera pares (features → label) a partir da análise de firmware.
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingSample {
    /// Features de entrada
    pub write_ratio: f32,
    pub read_ratio: f32,
    pub unique_values: u32,
    pub sequential: bool,
    pub register_count: u32,
    pub burst_size: u32,

    /// Label (tipo de bloco)
    pub block_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dataset {
    pub samples: Vec<TrainingSample>,
    pub feature_names: Vec<String>,
}

impl Dataset {
    pub fn new() -> Self {
        Self {
            samples: Vec::new(),
            feature_names: vec![
                "write_ratio".into(),
                "read_ratio".into(),
                "unique_values".into(),
                "sequential".into(),
                "register_count".into(),
                "burst_size".into(),
            ],
        }
    }

    /// Gera dataset sintético para treinamento
    pub fn generate_synthetic(count: usize) -> Self {
        let mut ds = Self::new();
        for i in 0..count {
            let label = match i % 4 {
                0 => "Doorbell",
                1 => "RegisterFile",
                2 => "Fifo",
                _ => "Status",
            };
            ds.samples.push(TrainingSample {
                write_ratio: match label {
                    "Doorbell" => 0.95 + (i as f32 / count as f32 * 0.04),
                    "RegisterFile" => 0.5,
                    "Fifo" => 0.8,
                    _ => 0.1,
                },
                read_ratio: match label {
                    "Doorbell" => 0.05,
                    "RegisterFile" => 0.5,
                    "Fifo" => 0.2,
                    _ => 0.9,
                },
                unique_values: match label {
                    "Doorbell" => 2,
                    "RegisterFile" => 16,
                    "Fifo" => 4,
                    _ => 1,
                },
                sequential: matches!(label, "Fifo"),
                register_count: match label {
                    "Doorbell" => 2,
                    "RegisterFile" => 8,
                    "Fifo" => 4,
                    _ => 1,
                },
                burst_size: match label {
                    "Doorbell" => 1,
                    "RegisterFile" => 4,
                    "Fifo" => 32,
                    _ => 1,
                },
                block_type: label.to_string(),
            });
        }
        ds
    }

    /// Exporta como JSON
    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).unwrap_or_default()
    }

    /// Exporta como CSV para treinamento externo
    pub fn to_csv(&self) -> String {
        let mut csv = String::from("write_ratio,read_ratio,unique_values,sequential,register_count,burst_size,block_type\n");
        for s in &self.samples {
            csv.push_str(&format!(
                "{},{},{},{},{},{},{}\n",
                s.write_ratio, s.read_ratio, s.unique_values,
                s.sequential as u8, s.register_count, s.burst_size, s.block_type
            ));
        }
        csv
    }
}

impl Default for Dataset {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_synthetic() {
        let ds = Dataset::generate_synthetic(100);
        assert_eq!(ds.samples.len(), 100);
        assert!(!ds.feature_names.is_empty());
    }

    #[test]
    fn test_dataset_csv() {
        let ds = Dataset::generate_synthetic(10);
        let csv = ds.to_csv();
        assert!(csv.contains("write_ratio"));
        assert!(csv.contains("Doorbell"));
        assert!(csv.contains("RegisterFile"));
    }

    #[test]
    fn test_dataset_json() {
        let ds = Dataset::generate_synthetic(5);
        let json = ds.to_json();
        assert!(json.contains("samples") || json.contains("TrainingSample"));
    }
}
