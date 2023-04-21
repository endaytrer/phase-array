precision highp float;

uniform float width;
uniform float height;
uniform vec3 sources[${sources.length}];
uniform float t;
uniform float a;
uniform float k;
uniform float omega;
uniform float vw;

  void main() {
  float x = (gl_FragCoord.x) / width * vw;
  float y = (height / 2.0 - gl_FragCoord.y) / width * vw;
  float ans = 0.0;
  for (int i = 0; i < ${sources.length}; i++) {
    float d = distance(vec2(x, y), vec2(sources[i].x, sources[i].y));
    float phase = omega * t - k * d + sources[i].z;
    // if (phase < 0.0) {
    //   continue;
    // }
    ans += (a / d * cos(phase));
  }
  float val = ans * 0.5 + 0.5;
  gl_FragColor = vec4(val, val, val, 1.0);
}