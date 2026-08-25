/**
 * Campo escalar χ — densidade de vorticidade (clássico, mensurável em fluidos).
 * Endpoints de pesquisa; não no caminho crítico financeiro.
 */

export function sampleChiField(gridSize = 16, seed = 0) {
  const field = [];
  let s = seed || Date.now();
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s / 0x7fffffff) * 2 - 1;
  };
  for (let y = 0; y < gridSize; y++) {
    const row = [];
    for (let x = 0; x < gridSize; x++) {
      const vx = rand();
      const vy = rand();
      const curl = Math.abs(vx - vy) * 0.5;
      row.push({ x, y, chi: curl, vx, vy });
    }
    field.push(row);
  }
  const mean = field.flat().reduce((a, c) => a + c.chi, 0) / (gridSize * gridSize);
  return {
    gridSize,
    meanChi: mean,
    disclaimer: "χ cosmológico (matéria escura) é hipótese especulativa — este campo é vorticidade clássica.",
    field,
  };
}
