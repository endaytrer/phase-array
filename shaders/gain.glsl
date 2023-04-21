precision highp float;

uniform float width;
uniform float height;
uniform vec3 sources[${sources.length}];
uniform float a;
uniform float k;
uniform float omega;
uniform float vw;

void main() {
  float x = (gl_FragCoord.x) / width * vw;
  float y = (height / 2.0 - gl_FragCoord.y) / width * vw;
  float ax = 0.0;
  float ay = 0.0;
  float e = 0.0;
  for (int i = 0; i < ${sources.length}; i++) {
    float d = distance(vec2(x, y), vec2(sources[i].x, sources[i].y));
    float phase = - k * d + sources[i].z;
    ax += a / d * cos(phase);
    ay += a / d * sin(phase);
    e += a / d;
  }
  float val = length(vec2(ax, ay));
  // gain:
  val = 20.0 * log(val / e);
  // to -80dB ~ 0dB
  val = (val + 80.0) / 80.0;
  gl_FragColor = vec4(0.75 * val + 0.25, 0.5 * val + 0.25, 1.0 - 0.75 * val, 1.0);
}