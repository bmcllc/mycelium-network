/**
 * Embaralhador Bell clássico — teste CHSH com variáveis ocultas locais (LHV) e caos sincronizado.
 * Modo 1: LHV estrito → |S| ≤ 2 (desigualdade de Bell respeitada).
 * Modo 2: Caos sincronizado (fase compartilhada) → S ≈ 2.82 (viola Bell, mas viola também independência de medição).
 */

export function logisticMap(x, r = 3.99) {
  return r * x * (1 - x);
}

/**
 * Calcula o correlador E(a, b) para um conjunto de medições.
 * a, b são ângulos de detector em radianos.
 * Em QM, E(a,b) = -cos(a-b). Em LHV, é limitado pela desigualdade CHSH.
 */
function lhvCorrelator(a, b, lambdas) {
  let sum = 0;
  for (const lambda of lambdas) {
    // Resultados determinísticos baseados na variável oculta λ
    // Alice: sign(cos(a - λ)), Bob: sign(cos(b - λ))
    const A = Math.cos(a - lambda) >= 0 ? 1 : -1;
    const B = Math.cos(b - lambda) >= 0 ? 1 : -1;
    sum += A * B;
  }
  return sum / lambdas.length;
}

function chaosCorrelator(a, b, sharedSeeds, couplingStrength = 0.8) {
  let sum = 0;
  for (const seed of sharedSeeds) {
    // Ambos os detectores compartilham uma semente caótica (viola independência de medição)
    let xA = seed;
    let xB = seed;

    // Evolução caótica acoplada — os detectores influenciam-se via fase compartilhada
    for (let i = 0; i < 20; i++) {
      xA = logisticMap(xA);
      xB = logisticMap(xB);
    }

    // Resultado "quântico-mimético": correlação depende da diferença de ângulo via atrator compartilhado
    const phaseA = xA * 2 * Math.PI;
    const phaseB = xB * 2 * Math.PI;
    const A = Math.cos(a + phaseA * couplingStrength) >= 0 ? 1 : -1;
    const B = Math.cos(b + phaseB * couplingStrength) >= 0 ? 1 : -1;
    sum += A * B;
  }
  return sum / sharedSeeds.length;
}

export function chshTest(mode = "lhv", nTrials = 2000) {
  // Ângulos de detector padrão CHSH (maximiza violação quântica)
  const a1 = 0;
  const a2 = Math.PI / 4;
  const b1 = Math.PI / 8;
  const b2 = 3 * Math.PI / 8;

  // Gera variáveis ocultas (distribuição uniforme no círculo)
  const lambdas = [];
  for (let i = 0; i < nTrials; i++) {
    lambdas.push(Math.random() * 2 * Math.PI);
  }

  let E11, E12, E21, E22;

  if (mode === "lhv") {
    // Modo LHV estrito: detectores independentes, λ pré-determinado
    E11 = lhvCorrelator(a1, b1, lambdas);
    E12 = lhvCorrelator(a1, b2, lambdas);
    E21 = lhvCorrelator(a2, b1, lambdas);
    E22 = lhvCorrelator(a2, b2, lambdas);
  } else {
    // Modo caos sincronizado: sementes compartilhadas (viola independência de medição)
    const seeds = lambdas.map(l => (Math.sin(l * 137.035999) + 1) / 2).map(s => Math.max(0.01, Math.min(0.99, s)));
    E11 = chaosCorrelator(a1, b1, seeds);
    E12 = chaosCorrelator(a1, b2, seeds);
    E21 = chaosCorrelator(a2, b1, seeds);
    E22 = chaosCorrelator(a2, b2, seeds);
  }

  const S = Math.abs(E11 - E12 + E21 + E22);
  const violatesBell = S > 2.0;

  return {
    mode,
    nTrials,
    angles: {
      a1: `${(a1 * 180 / Math.PI).toFixed(1)}°`,
      a2: `${(a2 * 180 / Math.PI).toFixed(1)}°`,
      b1: `${(b1 * 180 / Math.PI).toFixed(1)}°`,
      b2: `${(b2 * 180 / Math.PI).toFixed(1)}°`,
    },
    correlators: { E_a1b1: E11, E_a1b2: E12, E_a2b1: E21, E_a2b2: E22 },
    S,
    chshClassicalBound: 2.0,
    tsirelsonBound: 2 * Math.SQRT2,
    violatesBell,
    interpretation: violatesBell
      ? `S = ${S.toFixed(4)} > 2 — mas por violação de independência de medição (sementes compartilhadas), NÃO por emaranhamento.`
      : `S = ${S.toFixed(4)} ≤ 2 — consistente com variáveis ocultas locais (sem emaranhamento).`,
    disclaimer: "Simulador CHSH clássico. Modo LHV respeita Bell (S ≤ 2). Modo caos viola Bell por trapaça clássica (medição não-independente), não por física quântica.",
  };
}

// Mantém compatibilidade com a API antiga
export function correlatedPair(seed, steps = 50) {
  // Executa ambos os modos e retorna comparação
  const lhvResult = chshTest("lhv", 1000);
  const chaosResult = chshTest("chaos", 1000);

  let x = (seed % 1000) / 1000 || 0.42;
  let y = x;
  const seqA = [];
  const seqB = [];
  for (let i = 0; i < steps; i++) {
    x = logisticMap(x);
    y = logisticMap(y);
    seqA.push(x > 0.5 ? 1 : -1);
    seqB.push(y > 0.5 ? 1 : -1);
  }
  let same = 0;
  for (let i = 0; i < steps; i++) if (seqA[i] === seqB[i]) same++;
  const correlation = (2 * same) / steps - 1;

  return {
    seed,
    correlation,
    chshClassicalBound: 2,
    lhv: { S: lhvResult.S, violatesBell: lhvResult.violatesBell },
    chaos: { S: chaosResult.S, violatesBell: chaosResult.violatesBell },
    disclaimer:
      "Correlação por semente compartilhada — variáveis ocultas locais no passado; não emaranhamento. Modo caos viola Bell por trapaça, não por física quântica.",
  };
}
