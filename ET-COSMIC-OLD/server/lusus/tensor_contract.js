/**
 * Contração tensorial LUSUS-Q — void-runner Rust com fallback JS.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

function contractMatrices(a, aRows, aCols, b, bRows, bCols) {
  if (aCols !== bRows) {
    throw new Error(`Dimensões incompatíveis: ${aCols} != ${bRows}`);
  }
  const out = new Float64Array(aRows * bCols);
  for (let i = 0; i < aRows; i++) {
    for (let k = 0; k < bCols; k++) {
      let sum = 0;
      for (let j = 0; j < aCols; j++) {
        sum += a[i * aCols + j] * b[j * bCols + k];
      }
      out[i * bCols + k] = sum;
    }
  }
  return out;
}

function contractMpsChain(cores) {
  if (!cores?.length) throw new Error("mps chain requires cores");
  let state = Float64Array.from(cores[0].data);
  let rows = cores[0].shape[0];
  let cols = cores[0].shape[2];

  for (let idx = 1; idx < cores.length; idx++) {
    const core = cores[idx];
    const [cL, cD, cR] = core.shape;
    if (cols !== cL) {
      throw new Error(`bond mismatch at core ${idx}: ${cols} != ${cL}`);
    }
    state = contractMatrices(state, rows, cols, Float64Array.from(core.data), cL, cD * cR);
    cols = cD * cR;
  }
  return { data: state, rows, cols };
}

function frobeniusNorm(data) {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i] * data[i];
  return Math.sqrt(s);
}

function contractJs(body) {
  const started = performance.now();
  let data;
  let rows;
  let cols;

  if (body.mode === "matrix") {
    const a = Float64Array.from(body.a.data);
    const b = Float64Array.from(body.b.data);
    data = contractMatrices(a, body.a.rows, body.a.cols, b, body.b.rows, body.b.cols);
    rows = body.a.rows;
    cols = body.b.cols;
  } else if (body.mode === "mps_chain") {
    const r = contractMpsChain(body.cores);
    data = r.data;
    rows = r.rows;
    cols = r.cols;
  } else {
    throw new Error("mode must be matrix or mps_chain");
  }

  return {
    backend: "lusus_js_fallback",
    rows,
    cols,
    data: Array.from(data),
    norm: frobeniusNorm(data),
    elapsed_us: Math.round((performance.now() - started) * 1000),
  };
}

async function resolveVoidRunnerBin() {
  const envBin = process.env.VOID_RUNNER_BIN;
  if (envBin) return envBin;
  try {
    await execFileAsync("which", ["void-runner"]);
    return "void-runner";
  } catch {
    return null;
  }
}

export async function runTensorContract(body) {
  const bin = await resolveVoidRunnerBin();
  if (!bin) return contractJs(body);

  const dir = await mkdtemp(join(tmpdir(), "lusus-tensor-"));
  const inputPath = join(dir, "req.json");
  try {
    await writeFile(inputPath, JSON.stringify(body));
    const { stdout } = await execFileAsync(
      bin,
      ["tensor-contract", "--input", inputPath],
      { timeout: 120_000, maxBuffer: 32 * 1024 * 1024 },
    );
    return JSON.parse(stdout);
  } catch {
    return contractJs(body);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function tensorContractStatus() {
  const bin = await resolveVoidRunnerBin();
  return {
    available: Boolean(bin),
    void_runner_bin: bin,
    fallback: "lusus_js_fallback",
  };
}
