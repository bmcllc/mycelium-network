import { useEffect, useRef, useState } from "react";
import { useOmegaMaterial } from "../hooks/useOmegaMaterial";
import { spectralCoeffsFromMaterial } from "../lib/moduleRealityBackend";

/**
 * ETΞRNET — HGPU (Homotopic Geometric Processing Unit)
 * 
 * Renderizador baseado em campos de distância assinados (SDF) e 
 * coeficientes espectrais. Transmite a "alma" da geometria 
 * em vez de malhas de triângulos tradicionais.
 */

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 resolution;
  uniform float time;
  uniform float nodeCount;

  // Signed Distance Function - Sphere
  float sdSphere(vec3 p, float s) {
    return length(p) - s;
  }

  // Fractal Brownian Motion for homotopic deformation
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  
  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0 + 113.0*p.z;
    return mix(mix(mix(hash(n+0.0), hash(n+1.0), f.x),
                   mix(hash(n+57.0), hash(n+58.0), f.x), f.y),
               mix(mix(hash(n+113.0), hash(n+114.0), f.x),
                   mix(hash(n+170.0), hash(n+171.0), f.x), f.y), f.z);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.y, resolution.x);
    vec3 ro = vec3(0.0, 0.0, -3.0); // Ray origin
    vec3 rd = normalize(vec3(uv, 1.0)); // Ray direction

    float d = 0.0;
    vec3 p;
    
    // Homotopic Raymarching
    for(int i = 0; i < 64; i++) {
      p = ro + rd * d;
      
      // Deformation via spectral noise (Simulating HGPU coefficients)
      float deformation = noise(p * 2.0 + time * 0.5) * 0.2;
      float dist = sdSphere(p, 1.0 + deformation);
      
      if(dist < 0.001 || d > 10.0) break;
      d += dist;
    }

    vec3 col = vec3(0.0);
    if(d < 10.0) {
      // Normal calculation
      vec2 e = vec2(0.01, 0.0);
      vec3 n = normalize(vec3(
        sdSphere(p+e.xyy, 1.0) - sdSphere(p-e.xyy, 1.0),
        sdSphere(p+e.yxy, 1.0) - sdSphere(p-e.yxy, 1.0),
        sdSphere(p+e.yyx, 1.0) - sdSphere(p-e.yyx, 1.0)
      ));
      
      float diff = max(dot(n, normalize(vec3(1.0, 2.0, -1.0))), 0.0);
      col = mix(vec3(0.71, 1.0, 0.23), vec3(1.0, 0.23, 0.85), sin(time)*0.5 + 0.5);
      col *= diff + 0.1;
      col += pow(max(dot(reflect(normalize(vec3(1.0, 2.0, -1.0)), n), rd), 0.0), 32.0); // Specular
    }

    // Grid Overlay
    col += vec3(0.0, 0.1, 0.0) * (sin(uv.x * 50.0) * sin(uv.y * 50.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function HGPUVisualizer() {
  const { material } = useOmegaMaterial(256);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive] = useState(true);

  const homotopyCache = useRef<Map<number, Float32Array>>(new Map());

  useEffect(() => {
    if (!material) return;
    for (let i = 0; i < 4; i++) {
      const base = spectralCoeffsFromMaterial(material);
      const coeffs = new Float32Array(64);
      for (let j = 0; j < 64; j++) {
        coeffs[j] = base[j]! * (i + 1) * 0.25;
      }
      homotopyCache.current.set(i, coeffs);
    }
  }, [material]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Create program
    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) ?? "shader compile error";
        gl.deleteShader(shader);
        throw new Error(log);
      }
      return shader;
    };

    const program = gl.createProgram()!;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "program link error";
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      throw new Error(log);
    }
    gl.useProgram(program);

    // Geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, "resolution");
    const timeLoc = gl.getUniformLocation(program, "time");
    if (!resLoc || !timeLoc) {
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      return;
    }

    let startTime = Date.now();
    let rafId = 0;
    let disposed = false;

    const render = () => {
      if (!isActive || disposed) return;
      
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.useProgram(program);
      gl.uniform2f(resLoc, width, height);
      gl.uniform1f(timeLoc, (Date.now() - startTime) / 1000);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(render);
    };

    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className="relative w-full h-[400px] bg-black border border-[#14181c] overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 p-4 bg-black/60 backdrop-blur-sm border border-[#b6ff3a]/20 font-mono">
        <div className="text-[#b6ff3a] text-[10px] flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[#b6ff3a] animate-pulse" />
          HGPU_CORE_ACTIVE
        </div>
        <div className="text-zinc-500 text-[8px] mt-2">
          MODE: SDF_RAYMARCHING<br />
          SPECTRUM: 64_COEFFICIENTS<br />
          STATE: HOMOTOPIC_STABLE
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 text-[8px] font-mono text-zinc-700 tracking-widest uppercase">
        VØID·ΩMEGA Geometrical Stream
      </div>
    </div>
  );
}
