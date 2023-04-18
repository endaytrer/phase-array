const animation = document.getElementById('animation');
const phase = document.getElementById('phase');
const {width, height} = animation;
let t = 0;
let a = 1;
let k = 2 * Math.PI / 1;
let omega = 2 * Math.PI;
let sources = [];
let frame;
function Source(x, y, phi) {
  this.x = x;
  this.y = y;
  this.phi = phi;
}
sources.push(new Source(0, -2, 0))
sources.push(new Source(0, -1, 0))
sources.push(new Source(0,  0, 0))
sources.push(new Source(0,  1, 0))
sources.push(new Source(0,  2, 0))

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram
      )}`
    );
    return null;
  }

  return shaderProgram;
}


//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initBuffers(gl) {
  const positionBuffer = initPositionBuffer(gl);

  return {
    position: positionBuffer,
  };
}

function initPositionBuffer(gl) {
  // Create a buffer for the square's positions.
  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.
  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}
function drawScene(gl, programInfo, buffers, t) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  setPositionAttribute(gl, buffers, programInfo);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  gl.uniform3fv(programInfo.uniformLocations.sources, sources.flatMap((v) => [v.x, v.y, v.phi]));
  gl.uniform1f(programInfo.uniformLocations.width, width);
  gl.uniform1f(programInfo.uniformLocations.height, height);
  gl.uniform1f(programInfo.uniformLocations.t, t);
  gl.uniform1f(programInfo.uniformLocations.a, a);
  gl.uniform1f(programInfo.uniformLocations.k, k);
  gl.uniform1f(programInfo.uniformLocations.omega, omega);
  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function setPositionAttribute(gl, buffers, programInfo) {
  const numComponents = 2; // pull out 2 values per iteration
  const type = gl.FLOAT; // the data in the buffer is 32bit floats
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set of values to the next
  // 0 = use type and numComponents above
  const offset = 0; // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.aPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.aPosition);
}

function main() {
  
  
  const vsSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
  }
  `
  const fsSource = `
  precision highp float;

  uniform float width;
  uniform float height;
  uniform vec3 sources[${sources.length}];
  uniform float t;
  uniform float a;
  uniform float k;
  uniform float omega;
  float vw = 20.0;

  void main() {
    float x = (gl_FragCoord.x) / width * vw;
    float y = (height / 2.0 - gl_FragCoord.y) / width * vw;
    float ans = 0.0;
    for (int i = 0; i < ${sources.length}; i++) {
      float d = distance(vec2(x, y), vec2(sources[i].x, sources[i].y));
      float phase = omega * t - k * d + sources[i].z;
      if (phase < 0.0) {
        continue;
      }
      ans += (a / d * cos(phase));
    }
    float val = ans * 0.5 + 0.5;
    gl_FragColor = vec4(val, val, val, 1.0);
  }
  `

  const intensityFs = `
  precision highp float;

  uniform float width;
  uniform float height;
  uniform vec3 sources[${sources.length}];
  uniform float a;
  uniform float k;
  uniform float omega;
  float vw = 20.0;

  void main() {
    float x = (gl_FragCoord.x) / width * vw;
    float y = (height / 2.0 - gl_FragCoord.y) / width * vw;
    float ax = 0.0;
    float ay = 0.0;
    for (int i = 0; i < ${sources.length}; i++) {
      float d = distance(vec2(x, y), vec2(sources[i].x, sources[i].y));
      float phase = - k * d + sources[i].z;
      ax += a / d * cos(phase);
      ay += a / d * sin(phase);
    }
    float val = length(vec2(ax, ay));
    gl_FragColor = vec4(val, val, val, 1.0);
  }
  `
  const getInfo = (gl, prog) => ({
    program: prog,
    attribLocations: {
      aPosition: gl.getAttribLocation(prog, "a_position"),
    },
    uniformLocations: {
      sources: gl.getUniformLocation(prog, "sources"),
      width: gl.getUniformLocation(prog, "width"),
      height: gl.getUniformLocation(prog, "height"),
      t: gl.getUniformLocation(prog, "t"),
      a: gl.getUniformLocation(prog, "a"),
      k: gl.getUniformLocation(prog, "k"),
      omega: gl.getUniformLocation(prog, "omega"),
    }
  })

  const gla = animation.getContext('webgl');
  const shaderProgram = initShaderProgram(gla, vsSource, fsSource);
  const programInfo = getInfo(gla, shaderProgram);
  const buffers = initBuffers(gla);
  let then = 0;
  const tick = (now) => {
    now *= 0.001;
    const deltaTime = then == 0 ? 0 : now - then;
    then = now;
    frame = requestAnimationFrame(tick);
    drawScene(gla, programInfo, buffers, t);
    t += deltaTime;
  }
  frame = requestAnimationFrame(tick);

  const glp = phase.getContext('webgl');
  const program2 = initShaderProgram(glp, vsSource, intensityFs);
  const programInfo2 = getInfo(glp, program2);
  const buffers2 = initBuffers(glp);
  drawScene(glp, programInfo2, buffers2);
}
restart();
function restart() {

  if (frame) {
    cancelAnimationFrame(frame);
    t = 0;
  }
  const ns = parseInt(document.getElementById('input-ns').value);
  const w  = parseFloat(document.getElementById('input-w').value);
  const angle  = parseFloat(document.getElementById('input-angle').value);
  a = parseFloat(document.getElementById('input-a').value);
  const freq  = parseFloat(document.getElementById('input-freq').value);
  omega = 2 * Math.PI * freq;
  const wl  = parseFloat(document.getElementById('input-wl').value);
  k = 2 * Math.PI / wl;

  sources = [];
  let wave_pos = -w;
  let phase = 0;
  let interval = 2 * w / (ns - 1);
  for (let i = 0; i < ns; i += 1, wave_pos += interval, phase += k * interval * Math.sin(angle)) {
    sources.push(new Source(0, wave_pos, phase));
  }
  main();
}