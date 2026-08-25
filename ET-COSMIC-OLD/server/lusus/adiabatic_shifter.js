/**
 * Transformador adiabático — redshift controlado em guia de ondas (clássico).
 * Calcula a eficiência de transmissão e reflexão não-adiabática via integração de fase.
 */

export function calculateAdiabaticallyShifted(f0, a = 1.0, T = 1e-9) {
  const w0 = 0.1; // Largura inicial da guia (m)
  const w1 = w0 * a;
  const c = 3e8;

  // Sem variação de largura, sem reflexão
  if (Math.abs(a - 1) < 1e-5) {
    return {
      f0,
      a,
      transitionTimeS: T,
      frequencyHz: f0,
      reflectionAmplitude: 0,
      transmissionPower: 1.0,
      lossDB: 0,
      disclaimer: "Não há redshift real do espaço-tempo; é apenas compressão de guia mecânica com conservação do invariante adiabático."
    };
  }

  // Integração numérica do coeficiente de reflexão não-adiabático (WKB)
  const steps = 100;
  const dt = T / steps;
  let phase = 0;
  let re = 0;
  let im = 0;

  let prevF = f0;

  for (let step = 0; step <= steps; step++) {
    const t = (step * T) / steps;
    const w = w0 + (w1 - w0) * (1 - Math.cos((Math.PI * t) / T)) / 2;
    const f = (c / (2 * w));

    phase += 2 * Math.PI * f * dt;

    if (step > 0) {
      const df_dt = (f - prevF) / dt;
      const integrandFactor = (1 / (2 * f)) * df_dt * dt;
      re += integrandFactor * Math.cos(phase);
      im -= integrandFactor * Math.sin(phase);
    }
    prevF = f;
  }

  const R_amp = Math.min(0.999, Math.sqrt(re * re + im * im));
  const T_pow = 1.0 - R_amp * R_amp;
  const lossDB = -10 * Math.log10(T_pow);

  const finalF = f0 / a;

  return {
    f0,
    a,
    transitionTimeS: T,
    frequencyHz: finalF,
    wavelengthM: c / finalF,
    reflectionAmplitude: R_amp,
    transmissionPower: T_pow,
    lossDB,
    disclaimer: "Simulação de propagação adiabática eletromagnética em guias com paredes móveis. A perda aumenta para transições ultrarrápidas."
  };
}

export function adiabaticShift(f0Hz, expansionRatio, steps = 32) {
  const trajectory = [];
  for (let i = 0; i <= steps; i++) {
    const a = 1 + (expansionRatio - 1) * (i / steps);
    const result = calculateAdiabaticallyShifted(f0Hz, a, 1e-9);
    trajectory.push({
      step: i,
      scaleFactor: a,
      frequencyHz: result.frequencyHz,
      lossDB: result.lossDB,
      transmissionPower: result.transmissionPower
    });
  }
  const fFinal = trajectory[trajectory.length - 1].frequencyHz;
  return {
    f0Hz,
    fFinalHz: fFinal,
    expansionRatio,
    efficiency: trajectory[trajectory.length - 1].transmissionPower,
    trajectory,
    disclaimer: "Geometria variável — sem óptica não-linear quântica.",
  };
}
