//! Contração tensorial LUSUS-Q — matriz e cadeia MPS.
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatrixInput {
    pub data: Vec<f64>,
    pub rows: usize,
    pub cols: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MpsCoreInput {
    pub data: Vec<f64>,
    pub shape: [usize; 3],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum TensorContractRequest {
    Matrix { a: MatrixInput, b: MatrixInput },
    MpsChain { cores: Vec<MpsCoreInput> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TensorContractResponse {
    pub backend: &'static str,
    pub rows: usize,
    pub cols: usize,
    pub data: Vec<f64>,
    pub norm: f64,
    pub elapsed_us: u128,
}

pub fn contract_matrices(
    a: &[f64],
    a_rows: usize,
    a_cols: usize,
    b: &[f64],
    b_rows: usize,
    b_cols: usize,
) -> Result<Vec<f64>> {
    if a.len() != a_rows * a_cols {
        return Err(anyhow!("matrix A size mismatch"));
    }
    if b.len() != b_rows * b_cols {
        return Err(anyhow!("matrix B size mismatch"));
    }
    if a_cols != b_rows {
        return Err(anyhow!(
            "incompatible contraction dims: {} != {}",
            a_cols,
            b_rows
        ));
    }

    let mut out = vec![0.0; a_rows * b_cols];
    for i in 0..a_rows {
        for k in 0..b_cols {
            let mut sum = 0.0;
            for j in 0..a_cols {
                sum += a[i * a_cols + j] * b[j * b_cols + k];
            }
            out[i * b_cols + k] = sum;
        }
    }
    Ok(out)
}

pub fn contract_mps_chain(cores: &[MpsCoreInput]) -> Result<(Vec<f64>, usize, usize)> {
    if cores.is_empty() {
        return Err(anyhow!("mps chain requires at least one core"));
    }

    let first = &cores[0];
    let [chi_l, d, chi_r] = first.shape;
    if first.data.len() != chi_l * d * chi_r {
        return Err(anyhow!("core 0 size mismatch"));
    }

    let mut state = first.data.clone();
    let mut rows = chi_l;
    let mut cols = chi_r;

    for (idx, core) in cores.iter().enumerate().skip(1) {
        let [c_l, c_d, c_r] = core.shape;
        if core.data.len() != c_l * c_d * c_r {
            return Err(anyhow!("core {} size mismatch", idx));
        }
        if cols != c_l {
            return Err(anyhow!(
                "bond mismatch at core {}: {} != {}",
                idx,
                cols,
                c_l
            ));
        }

        let contracted = contract_matrices(&state, rows, cols, &core.data, c_l, c_d * c_r)?;
        rows = rows;
        cols = c_d * c_r;
        state = contracted;
    }

    Ok((state, rows, cols))
}

fn frobenius_norm(data: &[f64]) -> f64 {
    data.iter().map(|x| x * x).sum::<f64>().sqrt()
}

pub fn run_tensor_contract(req: TensorContractRequest) -> Result<TensorContractResponse> {
    let started = std::time::Instant::now();

    let (data, rows, cols) = match req {
        TensorContractRequest::Matrix { a, b } => {
            let out = contract_matrices(&a.data, a.rows, a.cols, &b.data, b.rows, b.cols)?;
            (out, a.rows, b.cols)
        }
        TensorContractRequest::MpsChain { cores } => contract_mps_chain(&cores)?,
    };

    Ok(TensorContractResponse {
        backend: "void_runner_rust",
        rows,
        cols,
        norm: frobenius_norm(&data),
        data,
        elapsed_us: started.elapsed().as_micros(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matrix_2x2() {
        let a = vec![1.0, 2.0, 3.0, 4.0];
        let b = vec![5.0, 6.0, 7.0, 8.0];
        let out = contract_matrices(&a, 2, 2, &b, 2, 2).unwrap();
        assert_eq!(out, vec![19.0, 22.0, 43.0, 50.0]);
    }
}
