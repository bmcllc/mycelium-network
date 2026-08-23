use crate::compare::ComparisonItem;
use crate::metrics::{aggregate_metrics, ValidationMetrics, ValidationThresholds};
use chrono::Local;
use serde::Serialize;

/// Contexto auditável do relatório (Path to Real R4)
#[derive(Debug, Clone, Serialize, Default)]
pub struct ReportContext {
    /// "dual" | "skipped"
    pub comparison_mode: String,
    pub max_latency_ratio: f64,
    pub original_trace: String,
    pub new_trace: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub extra_warnings: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tension: Option<serde_json::Value>,
}

impl ReportContext {
    pub fn dual(original: &str, new_trace: &str, max_latency: f64) -> Self {
        Self {
            comparison_mode: "dual".into(),
            max_latency_ratio: max_latency,
            original_trace: original.into(),
            new_trace: Some(new_trace.into()),
            extra_warnings: vec![],
            tension: None,
        }
    }

    pub fn skipped(original: &str, max_latency: f64, reason: &str) -> Self {
        Self {
            comparison_mode: "skipped".into(),
            max_latency_ratio: max_latency,
            original_trace: original.into(),
            new_trace: None,
            extra_warnings: vec![reason.into()],
            tension: None,
        }
    }
}

/// Gerador de relatório de validação
pub struct ReportGenerator;

impl ReportGenerator {
    /// Gera relatório em HTML
    pub fn generate_html(&self, items: &[ComparisonItem], title: &str) -> String {
        self.generate_html_with_context(items, title, &ReportContext::default())
    }

    pub fn generate_html_with_context(
        &self,
        items: &[ComparisonItem],
        title: &str,
        ctx: &ReportContext,
    ) -> String {
        let metrics = aggregate_metrics(items);
        let date = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let summary_color = if ctx.comparison_mode == "skipped" {
            "orange"
        } else if metrics.pass_rate >= 0.95 {
            "green"
        } else if metrics.pass_rate >= 0.8 {
            "orange"
        } else {
            "red"
        };

        let mut html = format!(r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>B.A.S.E. — {}</title>
<style>
body {{ font-family: 'JetBrains Mono', monospace; max-width: 960px; margin: 2em auto; padding: 0 1em; background: #1a1a2e; color: #e0e0e0; }}
h1 {{ color: #4a9eff; border-bottom: 2px solid #4a9eff; }}
h2 {{ color: #69db7c; }}
.summary {{ background: #16213e; padding: 1em; border-radius: 8px; margin: 1em 0; }}
.pass {{ color: #69db7c; }}
.fail {{ color: #ff6b6b; }}
.warn {{ color: #ffd43b; }}
table {{ width: 100%; border-collapse: collapse; margin: 1em 0; }}
th, td {{ text-align: left; padding: 8px; border-bottom: 1px solid #333; }}
th {{ background: #16213e; }}
tr:hover {{ background: #0f3460; }}
.metric {{ display: inline-block; margin: 0.5em; padding: 0.5em 1em; background: #16213e; border-radius: 4px; }}
</style></head><body>
<h1>🔬 B.A.S.E. Validation Report</h1>
<p><strong>{}</strong> | {}</p>
<div class="summary">
<h2 style="color: {}">Summary — {:.1}% pass rate (mode: {})</h2>
<div class="metric">✅ {} passed</div>
<div class="metric">❌ {} failed</div>
<div class="metric">📊 {} total</div>
<div class="metric">⏱ {:.2}x avg latency</div>
<div class="metric">🎯 {:.1}% value accuracy</div>
<div class="metric">⚙ max_latency_ratio={:.2}</div>
</div>
"#, title, title, date, summary_color,
              if ctx.comparison_mode == "skipped" { 0.0 } else { metrics.pass_rate * 100.0 },
              ctx.comparison_mode,
              metrics.passed, metrics.failed, metrics.total_operations,
              metrics.avg_latency_ratio, metrics.value_accuracy * 100.0,
              ctx.max_latency_ratio);

        html.push_str(&format!(
            "<p class=\"warn\">original_trace: {} | new_trace: {}</p>",
            html_escape(&ctx.original_trace),
            ctx.new_trace
                .as_deref()
                .map(html_escape)
                .unwrap_or_else(|| "(none — skipped)".into())
        ));

        let mut warnings = metrics.warnings.clone();
        warnings.extend(ctx.extra_warnings.clone());
        if !warnings.is_empty() {
            html.push_str("<h2>⚠️ Warnings</h2><ul>");
            for w in &warnings {
                html.push_str(&format!("<li class=\"warn\">{}</li>", html_escape(w)));
            }
            html.push_str("</ul>");
        }

        if let Some(ref tension) = ctx.tension {
            html.push_str("<h2>Ψ Tension</h2><pre>");
            html.push_str(&html_escape(&tension.to_string()));
            html.push_str("</pre>");
        }

        if ctx.comparison_mode != "skipped" && !items.is_empty() {
            let latencies: Vec<f64> = items.iter().map(|i| i.latency_ratio).collect();
            let max_lat = latencies.iter().cloned().fold(0.0f64, f64::max).max(1.0);
            let bar_width = 400.0 / items.len().max(1) as f64;
            html.push_str("<h2>📊 Latency Ratio</h2><svg width=\"420\" height=\"120\">");
            for (i, &lat) in latencies.iter().enumerate() {
                let bar_h = (lat / max_lat * 80.0).min(80.0);
                let x = 10.0 + i as f64 * bar_width;
                let color = if lat <= 1.5 {
                    "green"
                } else if lat <= 2.0 {
                    "gold"
                } else {
                    "red"
                };
                html.push_str(&format!(
                    r#"<rect x="{:.1}" y="{:.1}" width="{:.1}" height="{:.1}" fill="{}"/>"#,
                    x,
                    100.0 - bar_h,
                    bar_width.max(1.0),
                    bar_h,
                    color
                ));
            }
            html.push_str("</svg>");
        }

        let failed_items: Vec<&ComparisonItem> = items.iter().filter(|i| !i.passed).collect();
        if !failed_items.is_empty() {
            html.push_str("<h2>❌ Failures</h2><table><tr><th>#</th><th>Type</th><th>Address</th><th>Failures</th></tr>");
            for item in &failed_items {
                html.push_str(&format!(
                    "<tr><td>{}</td><td>{:?}</td><td>0x{:08x}</td><td class=\"fail\">{}</td></tr>",
                    item.operation_id,
                    item.original_event.event_type,
                    item.original_event.address,
                    item.failures.join(", "),
                ));
            }
            html.push_str("</table>");
        }

        html.push_str("</body></html>");
        html
    }

    /// Gera relatório em JSON
    pub fn generate_json(&self, items: &[ComparisonItem], title: &str) -> String {
        self.generate_json_with_context(items, title, &ReportContext::default())
    }

    pub fn generate_json_with_context(
        &self,
        items: &[ComparisonItem],
        title: &str,
        ctx: &ReportContext,
    ) -> String {
        let metrics = aggregate_metrics(items);
        let mut warnings = metrics.warnings.clone();
        warnings.extend(ctx.extra_warnings.clone());

        let report = serde_json::json!({
            "report": {
                "title": title,
                "timestamp": Local::now().to_rfc3339(),
                "comparison_mode": ctx.comparison_mode,
                "thresholds": {
                    "max_latency_ratio": ctx.max_latency_ratio,
                },
                "traces": {
                    "original": ctx.original_trace,
                    "new": ctx.new_trace,
                },
                "metrics": {
                    "total_operations": metrics.total_operations,
                    "passed": metrics.passed,
                    "failed": metrics.failed,
                    "pass_rate": if ctx.comparison_mode == "skipped" { serde_json::Value::Null } else { serde_json::json!(metrics.pass_rate) },
                    "avg_latency_ratio": metrics.avg_latency_ratio,
                    "value_accuracy": metrics.value_accuracy,
                    "address_accuracy": metrics.address_accuracy,
                },
                "warnings": warnings,
                "tension": ctx.tension,
                "failures": items.iter().filter(|i: &&ComparisonItem| !i.passed).map(|i| {
                    serde_json::json!({
                        "operation_id": i.operation_id,
                        "event_type": format!("{:?}", i.original_event.event_type),
                        "address": format!("0x{:08x}", i.original_event.address),
                        "failures": i.failures,
                        "latency_ratio": i.latency_ratio,
                    })
                }).collect::<Vec<_>>(),
            }
        });
        serde_json::to_string_pretty(&report).unwrap()
    }

    /// Convenience: thresholds object for callers
    pub fn thresholds_snapshot(th: &ValidationThresholds) -> serde_json::Value {
        serde_json::json!({
            "max_latency_ratio": th.max_latency_ratio,
            "min_value_accuracy": th.min_value_accuracy,
            "per_type": th.per_type,
        })
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tracer::{EventType, TraceEvent};

    fn mock_items() -> Vec<ComparisonItem> {
        vec![
            ComparisonItem {
                operation_id: 0,
                original_event: TraceEvent {
                    timestamp_ns: 1000,
                    channel: "CH0".into(),
                    event_type: EventType::MmioWrite,
                    address: 0x10000000,
                    value: Some(1),
                },
                actual_event: None,
                latency_ratio: 1.0,
                value_match: true,
                address_match: true,
                passed: true,
                failures: vec![],
            },
            ComparisonItem {
                operation_id: 1,
                original_event: TraceEvent {
                    timestamp_ns: 2000,
                    channel: "CH0".into(),
                    event_type: EventType::MmioRead,
                    address: 0x10000004,
                    value: None,
                },
                actual_event: None,
                latency_ratio: 3.5,
                value_match: false,
                address_match: false,
                passed: false,
                failures: vec!["ADDRESS_MISMATCH".into(), "TIMING_VIOLATION".into()],
            },
        ]
    }

    #[test]
    fn test_html_report() {
        let gen = ReportGenerator;
        let items = mock_items();
        let html = gen.generate_html(&items, "GPU Validation");
        assert!(html.contains("B.A.S.E."), "Should have title");
        assert!(html.contains("50.0%"), "Should show pass rate");
        assert!(html.contains("ADDRESS_MISMATCH"), "Should show failure");
    }

    #[test]
    fn test_json_report() {
        let gen = ReportGenerator;
        let items = mock_items();
        let json = gen.generate_json(&items, "GPU Validation");
        assert!(json.contains("pass_rate"), "Should have metrics");
        assert!(json.contains("failures"), "Should have failures list");
    }

    #[test]
    fn skipped_report_has_no_self_pass() {
        let gen = ReportGenerator;
        let ctx = ReportContext::skipped("orig.csv", 2.0, "NO_NEW_TRACE: comparison skipped");
        let json = gen.generate_json_with_context(&[], "pilot", &ctx);
        assert!(json.contains("skipped"));
        assert!(json.contains("NO_NEW_TRACE"));
        assert!(json.contains("\"pass_rate\": null") || json.contains("\"pass_rate\":null"));
        let _ = aggregate_metrics(&[]);
    }
}
