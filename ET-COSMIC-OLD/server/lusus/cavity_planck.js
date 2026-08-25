/**
 * Cavidade Planckiana — filtro espectral UV por modos discretos (clássico).
 */

export function planckSpectrum(freq, T = 300, h = 6.626e-34, kB = 1.381e-23, c = 3e8) {
  const x = (h * freq) / (kB * T);
  const rayleighJeans = (2 * kB * T * freq * freq) / (c * c);
  if (x > 700) {
    return { freq, rayleighJeans, planck: 0, ratio: 0 };
  }
  const planck = (2 * h * freq * freq * freq) / (c * c) / (Math.expm1(x) || 1e-300);
  return { freq, rayleighJeans, planck, ratio: planck / (rayleighJeans + 1e-30) };
}

export function cavityModes(nMax = 32, lengthM = 0.01, T = 300) {
  const modes = [];
  let cumulativeRJ = 0;
  let cumulativePlanck = 0;

  for (let n = 1; n <= nMax; n++) {
    const f = (n * 3e8) / (2 * lengthM);
    const spec = planckSpectrum(f, T);
    cumulativeRJ += spec.rayleighJeans;
    cumulativePlanck += spec.planck;
    modes.push({
      n,
      frequencyHz: f,
      rayleighJeans: spec.rayleighJeans,
      planck: spec.planck,
      ratio: spec.ratio,
      cumulativeRJ,
      cumulativePlanck
    });
  }

  return {
    lengthM,
    temperatureK: T,
    cumulativeEnergyDensityRJ: cumulativeRJ,
    cumulativeEnergyDensityPlanck: cumulativePlanck,
    modes,
    divergenceRatio: cumulativeRJ / (cumulativePlanck + 1e-30),
    disclaimer: "Analogia clássica de quantização por condições de contorno — demonstração da catástrofe do ultravioleta versus corte de Planck.",
  };
}
