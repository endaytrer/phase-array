const wave = document.getElementById('wave');
const gain = document.getElementById('gain');

const width = 640;
const height = 360;
let vsSourceRaw;
let waveRaw;
let gainRaw;
wave.width = width;
wave.height = height;
gain.width = width;
gain.height = height;
let vw = 40.0;
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
  gl.uniform1f(programInfo.uniformLocations.vw, vw);
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
async function load() {
  vsSourceRaw = await (await fetch("shaders/vs.glsl")).text();
  waveRaw = await (await fetch("shaders/wave.glsl")).text();
  gainRaw = await (await fetch("shaders/gain.glsl")).text();
}

function render() {
  const vsSource = vsSourceRaw;
  const waveSource = waveRaw.replaceAll(/\$\{(.*)\}/g, (_, p1) => eval(p1));
  const gainSource = gainRaw.replaceAll(/\$\{(.*)\}/g, (_, p1) => eval(p1))
  const getInfo = (gl, prog) => ({
    program: prog,
    attribLocations: {
      aPosition: gl.getAttribLocation(prog, "a_position"),
    },
    uniformLocations: {
      vw: gl.getUniformLocation(prog, "vw"),
      sources: gl.getUniformLocation(prog, "sources"),
      width: gl.getUniformLocation(prog, "width"),
      height: gl.getUniformLocation(prog, "height"),
      t: gl.getUniformLocation(prog, "t"),
      a: gl.getUniformLocation(prog, "a"),
      k: gl.getUniformLocation(prog, "k"),
      omega: gl.getUniformLocation(prog, "omega"),
    }
  })

  const gla = wave.getContext('webgl');
  const shaderProgram = initShaderProgram(gla, vsSource, waveSource);
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

  const glp = gain.getContext('webgl');
  const program2 = initShaderProgram(glp, vsSource, gainSource);
  const programInfo2 = getInfo(glp, program2);
  const buffers2 = initBuffers(glp);
  drawScene(glp, programInfo2, buffers2);
  offscreenContext.drawImage(gain, 0, 0);
}

function restart() {
  if (frame) {
    cancelAnimationFrame(frame);
    t = 0;
  }
  const ns = parseInt(document.getElementById('input-ns').value);
  document.getElementById('ns-display').innerText = `${ns}`;
  const interval  = parseFloat(document.getElementById('input-w').value);
  document.getElementById('w-display').innerText = `${interval}m`;
  const ox  = parseFloat(document.getElementById('input-ox').value);
  document.getElementById('ox-display').innerText = `${ox}m`;
  const angle  = parseFloat(document.getElementById('input-angle').value);
  document.getElementById('angle-display').innerText = `${angle}rad`;
  const intensity = parseFloat(document.getElementById('input-a').value);
  document.getElementById('a-display').innerText = `${intensity}`;
  a = intensity / ns;
  const freq = Math.exp(parseFloat(document.getElementById('input-freq').value));
  document.getElementById('freq-display').innerText = `${freq.toFixed(4)}Hz`;
  omega = 2 * Math.PI * freq;
  const wl = Math.exp(parseFloat(document.getElementById('input-wl').value));
  document.getElementById('wl-display').innerText = `${wl.toFixed(4)}m`;
  k = 2 * Math.PI / wl;

  sources = [];
  let wave_pos = - (ns - 1) * interval / 2;
  let phase = 0;
  for (let i = 0; i < ns; i += 1, wave_pos += interval, phase += k * interval * Math.sin(angle)) {
    sources.push(new Source(ox, wave_pos, phase));
  }
  render();
}


const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = gain.width;
offscreenCanvas.height = gain.height;
const offscreenContext = offscreenCanvas.getContext('2d');
const gainTooltip = document.getElementById('gainTooltip');

function showGainTooltip(event, val) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  gainTooltip.innerHTML = `${val.toFixed(2)} dB`;
  gainTooltip.style.left = `${event.clientX + 15 + scrollX}px`;
  gainTooltip.style.top = `${event.clientY + 15 + scrollY}px`;
  gainTooltip.style.display = 'block';
}

function hideGainTooltip() {
  gainTooltip.style.display = 'none';
}

function getMousePosition(parent, event) {
  const rect = parent.getBoundingClientRect();
  return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
  };
}
function colorToGain(red, green, blue) {
  const maxGain = 0; // 0 dB
  const minGain = -80; // -80 dB

  const maxRed = 255;
  const minRed = 64;
  const maxBlue = 64;
  const minBlue = 255;

  const redRatio = (red - minRed) / (maxRed - minRed);
  const blueRatio = (blue - minBlue) / (maxBlue - minBlue);

  // Calculate the average ratio between the red and blue channels
  const ratio = (redRatio + blueRatio) / 2;

  // Linearly interpolate the gain value based on the ratio
  const val = minGain + ratio * (maxGain - minGain);

  return val;
}

function updateGainTooltip(parent, event) {
  const mousePosition = getMousePosition(parent, event);
  const x = mousePosition.x;
  const y = mousePosition.y; // Invert the y-coordinate

  offscreenContext.drawImage(gain, 0, 0);
  const imageData = offscreenContext.getImageData(x, y, 1, 1);
  const rgba = imageData.data;
  const decibel = colorToGain(rgba[0], rgba[1], rgba[2]);
  showGainTooltip(event, decibel);
}

gain.addEventListener('mousemove', (e) => updateGainTooltip(gain, e));
wave.addEventListener('mousemove', (e) => updateGainTooltip(wave, e));
gain.addEventListener('mouseout', hideGainTooltip);
wave.addEventListener('mouseout', hideGainTooltip);

async function init() {
  await load();
  restart();
}

init();