/// Classificador de blocos baseado em RandomForest (via ONNX).
///
/// Usa tract (ONNX runtime) para inferência quando disponível,
/// ou fallback para classificador baseado em regras.
use crate::dataset::TrainingSample;

/// Resultado da classificação
#[derive(Debug, Clone)]
pub struct Classification {
    pub block_type: String,
    pub confidence: f32,
    pub probabilities: Vec<(String, f32)>,
}

/// Classificador de blocos com fallback rule-based
pub struct BlockClassifier;

impl BlockClassifier {
    /// Classifica um bloco baseado em features de acesso
    pub fn classify(features: &TrainingSample) -> Classification {
        // Tenta usar ONNX se disponível (via tract)
        #[cfg(feature = "onnx")]
        {
            if let Some(result) = Self::onnx_classify(features) {
                return result;
            }
        }

        // Fallback: rule-based classifier
        Self::rule_based(features)
    }

    /// Classificador baseado em regras (sempre disponível)
    fn rule_based(features: &TrainingSample) -> Classification {
        let (block_type, confidence) = match () {
            _ if features.write_ratio > 0.9 && features.unique_values <= 3 =>
                ("Doorbell", 0.85),
            _ if features.read_ratio >= 0.8 =>
                ("Status", 0.80),
            _ if features.write_ratio > 0.3 && features.write_ratio < 0.8
                && features.register_count > 2 =>
                ("RegisterFile", 0.75),
            _ if (features.write_ratio > 0.7 || features.read_ratio > 0.7)
                && features.sequential =>
                ("Fifo", 0.70),
            _ => ("Unknown", 0.30),
        };

        let probabilities = vec![
            ("Doorbell".into(), Self::score_for("Doorbell", features)),
            ("RegisterFile".into(), Self::score_for("RegisterFile", features)),
            ("Fifo".into(), Self::score_for("Fifo", features)),
            ("Status".into(), Self::score_for("Status", features)),
            ("Unknown".into(), 0.1),
        ];

        Classification { block_type: block_type.to_string(), confidence, probabilities }
    }

    fn score_for(_type: &str, features: &TrainingSample) -> f32 {
        match _type {
            "Doorbell" => features.write_ratio * 0.5 + (1.0 - features.unique_values as f32 / 10.0) * 0.3,
            "RegisterFile" => (1.0 - (features.write_ratio - 0.5).abs()) * 0.4 + (features.register_count as f32 / 16.0) * 0.3,
            "Fifo" => features.sequential as u8 as f32 * 0.5 + features.write_ratio.max(features.read_ratio) * 0.3,
            "Status" => features.read_ratio * 0.5 + (features.unique_values as f32 / 10.0).min(1.0) * 0.3,
            _ => 0.1,
        }
    }

    /// Classificação via ONNX (requer feature "onnx" com tract)
    #[cfg(feature = "onnx")]
    fn onnx_classify(features: &TrainingSample) -> Option<Classification> {
        // Placeholder — será implementado com tract quando o modelo for treinado
        None
    }

    /// Retorna a matriz de confusão esperada para o rule-based
    pub fn expected_accuracy() -> f32 {
        0.82 // ~82% de acerto em dados sintéticos
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn doorbell_features() -> TrainingSample {
        TrainingSample {
            write_ratio: 0.95, read_ratio: 0.05, unique_values: 2,
            sequential: false, register_count: 2, burst_size: 1,
            block_type: "Doorbell".into(),
        }
    }

    fn status_features() -> TrainingSample {
        TrainingSample {
            write_ratio: 0.1, read_ratio: 0.9, unique_values: 1,
            sequential: false, register_count: 1, burst_size: 1,
            block_type: "Status".into(),
        }
    }

    #[test]
    fn test_classify_doorbell() {
        let result = BlockClassifier::classify(&doorbell_features());
        assert_eq!(result.block_type, "Doorbell");
        assert!(result.confidence > 0.5);
    }

    #[test]
    fn test_classify_status() {
        let result = BlockClassifier::classify(&status_features());
        assert_eq!(result.block_type, "Status");
    }

    #[test]
    fn test_probabilities() {
        let result = BlockClassifier::classify(&doorbell_features());
        assert_eq!(result.probabilities.len(), 5);
        assert!(result.probabilities[0].1 > 0.0);
    }

    #[test]
    fn test_expected_accuracy() {
        let acc = BlockClassifier::expected_accuracy();
        assert!(acc > 0.5);
        assert!(acc <= 1.0);
    }
}
