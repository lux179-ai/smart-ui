// Shader per la relazione "DURING" (Effetto Pulse/Respiro)
export const DURING_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  
  void main() {
    // Battito cardiaco a 60 BPM
    float heartbeat = sin(uTime * 3.0) * 0.5 + 0.5;
    
    // Espande e contrae la larghezza visiva (glow)
    float width = 0.05 + (heartbeat * 0.02);
    
    // Colore: Bianco con alone ciano impercettibile
    vec3 color = mix(vec3(1.0), vec3(0.0, 1.0, 1.0), 0.15);
    
    // Calcolo alpha per la linea sfumata
    float alpha = smoothstep(width, width - 0.02, abs(vUv.y - 0.5));
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Shader per la relazione "DISTINCT" (Pixel Sorting / Glitch)
export const DISTINCT_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 pos = vUv;
    
    // Spostamento casuale dei pixel (Glitch)
    float noise = random(vec2(floor(pos.x * 50.0), floor(uTime * 10.0)));
    if (noise > 0.9) {
        pos.y += (random(pos) - 0.5) * 0.1;
    }

    float line = step(0.45, pos.y) - step(0.55, pos.y);
    gl_FragColor = vec4(vec3(1.0), line); // Bianco puro, ma glitchato
  }
`;
