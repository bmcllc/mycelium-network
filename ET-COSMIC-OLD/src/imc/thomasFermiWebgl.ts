/**
 * VOID-514 — visualização WebGL da densidade TF (triagem rápida no dispositivo).
 */

export function renderThomasFermiDensityCanvas(
  canvas: HTMLCanvasElement,
  bindingEv: number,
  separation = 1.4,
): void {
  const gl = canvas.getContext("webgl");
  if (!gl) return;
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`;
  const fs = `
    precision mediump float;
    uniform float u_bind;
    uniform float u_sep;
    void main(){
      vec2 uv = gl_FragCoord.xy / vec2(${canvas.width}.0, ${canvas.height}.0);
      float d1 = distance(uv, vec2(0.35, 0.5));
      float d2 = distance(uv, vec2(0.35 + u_sep * 0.08, 0.5));
      float rho = exp(-2.0*d1) + exp(-2.0*d2);
      float e = clamp(rho * (1.0 + u_bind * 0.1), 0.0, 1.0);
      gl_FragColor = vec4(e, e * 0.6, 1.0 - e, 1.0);
    }`;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1f(gl.getUniformLocation(prog, "u_bind"), bindingEv);
  gl.uniform1f(gl.getUniformLocation(prog, "u_sep"), separation);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
