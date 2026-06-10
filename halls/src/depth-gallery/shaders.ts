import * as THREE from "three";

/**
 * Vertex shader for Depth Gallery textured planes.
 *
 * Hand-written (we don't compose with three's <position_vert> chunk because
 * it conflicts with custom uniform setups). Just passes UVs through and
 * applies the standard MVP transform.
 */
export const planeVert: string = `varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Fragment shader for Depth Gallery textured planes.
 *
 * Samples the plane's texture, applies a per-frame opacity (driven by
 * Gallery.ts based on camera distance), and desaturates toward grayscale
 * as the plane fades — so receding planes feel like they sink into the
 * mood color rather than abruptly disappearing.
 *
 * vUv is clamped to [0,1] to avoid sampling outside the texture when
 * geometry UVs drift slightly past the edges.
 */
export const planeFrag: string = `precision mediump float;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uDesaturate;

varying vec2 vUv;

void main() {
  vec2 uv = clamp(vUv, vec2(0.0), vec2(1.0));
  vec4 tex = texture2D(uTexture, uv);
  float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  vec3 color = mix(tex.rgb, vec3(gray), uDesaturate);
  gl_FragColor = vec4(color, tex.a * uOpacity);
}
`;

/**
 * Uniform set used by every plane's ShaderMaterial.
 *
 * Each call returns a *fresh* object so that planes don't accidentally
 * share uniform references — Gallery.ts mutates `uOpacity.value` and
 * `uDesaturate.value` per-plane per-frame.
 */
export interface PlaneUniforms {
  uTexture: { value: THREE.Texture };
  uOpacity: { value: number };
  uDesaturate: { value: number };
}

export function createPlaneUniforms(texture: THREE.Texture): PlaneUniforms {
  return {
    uTexture: { value: texture },
    uOpacity: { value: 1.0 },
    uDesaturate: { value: 0.0 },
  };
}
