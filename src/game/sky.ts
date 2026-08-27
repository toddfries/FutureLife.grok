import * as THREE from "three";
import { WORLD_HEX } from "./palette";

const SKY_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uNadir;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
varying vec3 vWorld;
void main() {
  vec3 dir = normalize(vWorld);
  float h = dir.y;
  vec3 col = mix(uNadir, uHorizon, smoothstep(-0.35, 0.02, h));
  col = mix(col, uZenith, smoothstep(0.05, 0.85, h));
  float sun = pow(max(0.0, dot(dir, normalize(uSunDir))), 48.0);
  col += uSunColor * sun * 0.9;
  float haze = pow(1.0 - abs(h), 4.0);
  col = mix(col, uHorizon, haze * 0.35);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function addSky(scene: THREE.Scene) {
  const uniforms = {
    uZenith: { value: new THREE.Color(WORLD_HEX.skyZenith) },
    uHorizon: { value: new THREE.Color(WORLD_HEX.skyHorizon) },
    uNadir: { value: new THREE.Color(0x0c2a32) },
    uSunDir: { value: new THREE.Vector3(0.45, 0.62, 0.35).normalize() },
    uSunColor: { value: new THREE.Color(WORLD_HEX.sun) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(3600, 24, 16), mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(22, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xc9c4b8 }),
  );
  moon.position.set(620, 340, -980);
  scene.add(moon);

  return { mesh, uniforms, planet: moon };
}

export function addLights(scene: THREE.Scene, shadows: boolean) {
  const hemi = new THREE.HemisphereLight(
    WORLD_HEX.ambientSky,
    WORLD_HEX.ambientGround,
    0.9,
  );
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(WORLD_HEX.sun, 1.85);
  sun.position.set(40, 160, 120);
  sun.castShadow = shadows;
  if (shadows) {
    sun.shadow.mapSize.set(1024, 1024);
    const s = 180;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 420;
    sun.shadow.bias = -0.0008;
  }
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x7eb8b0, 0.45);
  fill.position.set(-40, 50, -40);
  scene.add(fill);

  const gulf = new THREE.DirectionalLight(0xffe6c2, 0.75);
  gulf.position.set(10, 55, 90);
  scene.add(gulf);

  return { hemi, sun };
}

export function addOcean(scene: THREE.Scene) {
  const geo = new THREE.PlaneGeometry(4000, 4000, 48, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({
    color: WORLD_HEX.ocean,
    transparent: true,
    opacity: 0.88,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = 0;
  scene.add(mesh);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = new Float32Array(pos.array.length);
  base.set(pos.array);

  return { mesh, geo, base };
}

export function rippleOcean(
  ocean: { geo: THREE.PlaneGeometry; base: Float32Array },
  t: number,
) {
  const pos = ocean.geo.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const base = ocean.base;
  for (let i = 0; i < arr.length; i += 3) {
    const x = base[i]!;
    const z = base[i + 2]!;
    arr[i + 1] =
      Math.sin(x * 0.02 + t * 0.7) * 0.35 + Math.cos(z * 0.017 - t * 0.55) * 0.28;
  }
  pos.needsUpdate = true;
  ocean.geo.computeVertexNormals();
}
