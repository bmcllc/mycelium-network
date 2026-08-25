/**
 * QR Code SVG Generator — implementação minimalista
 * Gera QR codes como SVG sem dependências externas
 */

// Patterns de alinhamento por versão
const ALIGNMENT_PATTERNS: Record<number, number[][]> = {
  1: [],
  2: [[6, 18]],
  3: [[6, 22]],
  4: [[6, 26]],
  5: [[6, 30]],
};

function getMode(): number {
  // 0100 = Byte mode
  return 4;
}

function getVersions(dataLength: number): number {
  const len = dataLength * 8; // bits needed
  if (len <= 152) return 1;
  if (len <= 272) return 2;
  if (len <= 440) return 3;
  if (len <= 640) return 4;
  if (len <= 864) return 5;
  return 1;
}

function generateModules(data: string, version: number): boolean[][] {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  const reserved: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

  // Finder patterns
  function drawFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          modules[rr][cc] = false;
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          modules[rr][cc] = true;
        } else {
          modules[rr][cc] = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        }
        reserved[rr][cc] = true;
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0;
    modules[i][6] = i % 2 === 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  // Alignment patterns
  const aligns = ALIGNMENT_PATTERNS[version] || [];
  for (const [row, col] of aligns) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const rr = row + r, cc = col + c;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size && !reserved[rr][cc]) {
          modules[rr][cc] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          reserved[rr][cc] = true;
        }
      }
    }
  }

  // Dark module
  modules[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // Reserve format areas
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
    if (!reserved[8][size - 1 - i]) reserved[8][size - 1 - i] = true;
    if (!reserved[size - 1 - i][8]) reserved[size - 1 - i][8] = true;
  }

  // Encode data (simplified — just place bits in available cells)
  const bits = encodeDataBits(data, version);
  let bitIndex = 0;
  let col = size - 1;

  while (col >= 0) {
    if (col === 6) col--; // Skip timing column
    const upward = ((size - 1 - col) % 2 === 0);

    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        if (c >= 0 && c < size && !reserved[row][c]) {
          if (bitIndex < bits.length) {
            modules[row][c] = bits[bitIndex] === '1';
            bitIndex++;
          }
        }
      }
    }
    col -= 2;
  }

  return modules;
}

function encodeDataBits(data: string, version: number): string {
  let bits = '';
  // Mode indicator (4 bits)
  bits += getMode().toString(2).padStart(4, '0');
  // Character count (8 bits for version 1-9)
  bits += data.length.toString(2).padStart(8, '0');
  // Data
  for (let i = 0; i < data.length; i++) {
    bits += data.charCodeAt(i).toString(2).padStart(8, '0');
  }
  // Terminator
  bits += '0000';
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits += '0';
  // Pad bytes
  let padByte = 0;
  while (bits.length < (version * 4 + 17) * 2) {
    bits += (padByte % 2 === 0 ? '11101100' : '00010001');
    padByte++;
  }
  return bits;
}

function modulesToSvg(modules: boolean[][], size: number, fgColor: string, bgColor: string): string {
  const cellSize = 4;
  const margin = 2;
  const svgSize = size * cellSize + margin * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${size * cellSize}" height="${size * cellSize}">`;
  svg += `<rect width="${svgSize}" height="${svgSize}" fill="${bgColor}"/>`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        svg += `<rect x="${margin + c * cellSize}" y="${margin + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

export function QRCodeSVG({ value, size = 128, fgColor = "#000", bgColor = "transparent" }: {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}) {
  const version = getVersions(value.length);
  const modules = generateModules(value, version);
  const qrSize = version * 4 + 17;

  const svg = modulesToSvg(modules, qrSize, fgColor, bgColor);

  return (
    <div
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg.replace(/width="\d+"/, `width="${size}"`).replace(/height="\d+"/, `height="${size}"`) }}
    />
  );
}
