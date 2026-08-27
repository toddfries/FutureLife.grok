import { A as RingGeometry, C as Object3D, D as Quaternion, E as PlaneGeometry, F as Timer, L as Vector3, M as Scene, N as ShaderMaterial, P as SphereGeometry, S as MeshPhongMaterial, T as PerspectiveCamera, _ as MathUtils, a as Color, b as MeshBasicMaterial, c as DirectionalLight, d as Float32BufferAttribute, f as Fog, g as InstancedMesh, h as IcosahedronGeometry, i as CanvasTexture, j as SRGBColorSpace, k as RepeatWrapping, l as DynamicDrawUsage, m as HemisphereLight, n as BoxGeometry, o as ConeGeometry, p as Group, r as BufferGeometry, s as CylinderGeometry, t as WebGLRenderer, u as Euler, v as Matrix4, w as OctahedronGeometry, x as MeshLambertMaterial, y as Mesh } from "../_libs/three.mjs";
import { a as WORLD_HEX, i as FACE_SHADE, n as addPlanet, o as isOpaque, r as BLOCK_RGB } from "./routes-DiWBtRiJ.mjs";
import { n as createNoise3D, t as createNoise2D } from "../_libs/simplex-noise.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/engine-Dpq2Jtbb.js
/** Seeded PRNG (mulberry32) plus integer hash — never use Math.random for worldgen. */
function xmur3(str) {
	let h = 1779033703 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
		h = h << 13 | h >>> 19;
	}
	h = Math.imul(h ^ h >>> 16, 2246822507);
	h = Math.imul(h ^ h >>> 13, 3266489909);
	return (h ^= h >>> 16) >>> 0;
}
function mulberry32(seed) {
	let s = seed >>> 0;
	return () => {
		s = s + 1831565813 >>> 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function uhash(x, y, seed) {
	let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1597334677);
	h = Math.imul(h ^ h >>> 13, 1274126177);
	return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function uhash3(x, y, z, seed) {
	let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2146121005) ^ Math.imul(seed | 0, 1597334677);
	h = Math.imul(h ^ h >>> 13, 1274126177);
	return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function qualityFromDetail(t) {
	const u = Math.min(1, Math.max(0, t));
	return {
		voxelSize: 10 - u * 7,
		radius: Math.round(3 + u * 4),
		treeDensity: .028 + u * .09,
		giantTrees: u > .12,
		spores: u > .18,
		waterfalls: u > .16,
		shadows: u > .55
	};
}
function fbm2(n, x, z, oct = 5) {
	let a = 0;
	let amp = 1;
	let f = 1;
	let s = 0;
	for (let i = 0; i < oct; i++) {
		a += amp * n(x * f, z * f);
		s += amp;
		amp *= .5;
		f *= 2.05;
	}
	return a / s;
}
function fbm3(n, x, y, z, oct = 4) {
	let a = 0;
	let amp = 1;
	let f = 1;
	let s = 0;
	for (let i = 0; i < oct; i++) {
		a += amp * n(x * f, y * f, z * f);
		s += amp;
		amp *= .5;
		f *= 2.03;
	}
	return a / s;
}
var World = class {
	seed;
	voxelSize;
	n2;
	n2b;
	n3;
	constructor(seed, voxelSize) {
		this.seed = seed;
		this.voxelSize = voxelSize;
		this.n2 = createNoise2D(mulberry32(seed));
		this.n2b = createNoise2D(mulberry32(seed ^ 2654435769));
		this.n3 = createNoise3D(mulberry32(seed ^ 2246822507));
	}
	islandAt(wx, wz) {
		const gx = Math.floor(wx / 248);
		const gz = Math.floor(wz / 248);
		let best = Infinity;
		let cx = 0;
		let cz = 0;
		let rnd = 0;
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
			const ix = gx + i;
			const iz = gz + j;
			const r = uhash(ix, iz, this.seed);
			const fx = (ix + .18 + uhash(ix, iz, this.seed + 1) * .64) * 248;
			const fz = (iz + .18 + uhash(ix, iz, this.seed + 2) * .64) * 248;
			const dx = wx - fx;
			const dz = wz - fz;
			const d = dx * dx + dz * dz;
			if (d < best) {
				best = d;
				cx = fx;
				cz = fz;
				rnd = r;
			}
		}
		const present = rnd > .5;
		const maxR = 36 + rnd * 98;
		const layer = uhash(Math.floor(cx), Math.floor(cz), this.seed + 7);
		const base = layer < .26 ? 4 : layer < .58 ? 46 : 102;
		const peak = base + 16 + rnd * 38 + fbm2(this.n2, cx * .006, cz * .006, 3) * 12;
		return {
			d: Math.sqrt(best),
			cx,
			cz,
			rnd,
			maxR,
			peak,
			base,
			present
		};
	}
	/** Sample the voxel at a world-space point. Deterministic per (seed, voxelSize). */
	blockAt(wx, wy, wz) {
		const vs = this.voxelSize;
		const x = Math.floor(wx / vs) * vs + vs * .5;
		const y = Math.floor(wy / vs) * vs + vs * .5;
		const z = Math.floor(wz / vs) * vs + vs * .5;
		if (y > 230 || y < -36) return 0;
		const sbx = x;
		const sbz = z + 28;
		if (sbx * sbx + sbz * sbz < 36100) {
			if (y < 1.4 && y > -8) return y > -2 ? 4 : 3;
			return 0;
		}
		const floor = -12 + fbm2(this.n2, x * .012, z * .012, 4) * 9 + this.n2b(x * .04, z * .04) * 2;
		if (y <= floor) {
			if (y > floor - vs * 1.6) return y > -4 ? 4 : 3;
			return 3;
		}
		if (y < 0) return 0;
		const warp = 14 * fbm2(this.n2b, x * .007 + 4, z * .007 - 3, 3);
		const isle = this.islandAt(x + warp, z - warp * .35);
		const n3 = fbm3(this.n3, x * .018, y * .028, z * .018, 4);
		if (!isle.present) {
			if (n3 > .7 && y > 22 && y < 175) return n3 > .8 ? 9 : 3;
			return 0;
		}
		const t = isle.d / isle.maxR;
		if (t > 1.08) {
			if (n3 > .73 && y > 18 && y < 165) return n3 > .84 ? 9 : 3;
			return 0;
		}
		const dome = Math.pow(Math.max(0, 1 - t * t), .52);
		const surface = isle.peak * (.34 + .66 * dome) + n3 * 6.5;
		const underCut = surface - (9 + (1 - t) * 24) * (.72 + n3 * .28) * (.42 + .58 * dome) + (1 - dome) * 5;
		if (y > surface + vs * .35 || y < underCut) return 0;
		const lake = fbm2(this.n2b, x * .02 + 30, z * .02, 3);
		const layer = uhash(Math.floor(isle.cx), Math.floor(isle.cz), this.seed + 7);
		const wantLake = lake > .34 && t < .44 && layer < .62 && dome > .45 && surface > 8;
		if (wantLake && y > surface - vs * 2.2 && y <= surface) return 5;
		if (wantLake && y > surface - vs * 3.2 && y <= surface - vs * 2.2) return 4;
		const fromTop = surface - y;
		if (fromTop < vs * .95) return n3 > .15 ? 1 : 8;
		if (fromTop < vs * 3.4) return 2;
		if (y < underCut + vs * 2.8) return n3 > .38 ? 9 : 3;
		if (n3 > .22 && (Math.floor(y / vs) & 3) === 0) return 10;
		return 3;
	}
	surfaceAt(wx, wz) {
		const vs = this.voxelSize;
		for (let y = 200; y > -4; y -= vs) {
			const b = this.blockAt(wx, y, wz);
			if (b !== 0 && b !== 5) return y;
		}
		return -8;
	}
};
function chunkOrigin(cx, cz, voxelSize) {
	const span = 16 * voxelSize;
	return {
		x: cx * span,
		z: cz * span,
		y: -8 * voxelSize
	};
}
function pushQuad(pos, nor, col, corners, nx, ny, nz, rgb, shade, jitter) {
	const r = Math.min(1, rgb[0] * shade * jitter);
	const g = Math.min(1, rgb[1] * shade * jitter);
	const b = Math.min(1, rgb[2] * shade * jitter);
	const a = corners[0];
	const c1 = corners[1];
	const d = corners[2];
	const tri = [
		a,
		c1,
		d,
		a,
		d,
		corners[3]
	];
	for (const p of tri) {
		pos.push(p[0], p[1], p[2]);
		nor.push(nx, ny, nz);
		col.push(r, g, b);
	}
}
/**
* Culled-face mesh with greedy merging. Neighbor voxels are sampled from the
* density function so chunk borders never leak faces.
*/
function meshChunk(world, cx, cz, quality) {
	const vs = world.voxelSize;
	const origin = chunkOrigin(cx, cz, vs);
	const sx = 16;
	const sy = 48;
	const sz = 16;
	const data = new Uint8Array(768 * sz);
	const at = (x, y, z) => {
		if (x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz) return data[x + z * sx + y * sx * sz];
		const wx = origin.x + x * vs;
		const wy = origin.y + y * vs;
		const wz = origin.z + z * vs;
		return world.blockAt(wx, wy, wz);
	};
	for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
		const wx = origin.x + x * vs;
		const wy = origin.y + y * vs;
		const wz = origin.z + z * vs;
		data[x + z * sx + y * sx * sz] = world.blockAt(wx, wy, wz);
	}
	for (let z = 2; z < 14; z++) for (let x = 2; x < 14; x++) for (let y = 46; y > 1; y--) {
		const b = data[x + z * sx + y * sx * sz];
		if (b !== 1 && b !== 8) continue;
		if (uhash(cx * 16 + x, cz * 16 + z, world.seed + 91) > quality.treeDensity * .45) break;
		const hgt = 2 + Math.floor(uhash(x, z, world.seed + 3) * 4);
		for (let t = 1; t <= hgt && y + t < 47; t++) data[x + z * sx + (y + t) * sx * sz] = 7;
		const top = Math.min(46, y + hgt);
		for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
			if (Math.abs(dx) + Math.abs(dz) > 3) continue;
			const lx = x + dx;
			const lz = z + dz;
			if (lx < 0 || lz < 0 || lx >= sx || lz >= sz) continue;
			for (let dy = 0; dy <= 2; dy++) {
				const ly = top + dy;
				if (ly >= sy) continue;
				const li = lx + lz * sx + ly * sx * sz;
				if (data[li] === 0) data[li] = 6;
			}
		}
		break;
	}
	const solid = emitGreedy(at, sx, sy, sz, vs, origin, false);
	const water = emitGreedy(at, sx, sy, sz, vs, origin, true);
	const placements = [];
	collectPlacements(world, cx, cz, origin, vs, data, quality, placements);
	return {
		solid,
		water,
		placements
	};
}
function emitGreedy(at, sx, sy, sz, vs, origin, waterPass) {
	const pos = [];
	const nor = [];
	const col = [];
	const dims = [
		sx,
		sy,
		sz
	];
	const want = (b) => waterPass ? b === 5 : isOpaque(b);
	for (let d = 0; d < 3; d++) {
		const u = (d + 1) % 3;
		const v = (d + 2) % 3;
		const x = [
			0,
			0,
			0
		];
		const q = [
			0,
			0,
			0
		];
		q[d] = 1;
		const mask = new Int16Array(dims[u] * dims[v]);
		for (x[d] = -1; x[d] < dims[d];) {
			let n = 0;
			for (x[v] = 0; x[v] < dims[v]; x[v]++) for (x[u] = 0; x[u] < dims[u]; x[u]++) {
				const a = want(at(x[0], x[1], x[2]));
				const b = want(at(x[0] + q[0], x[1] + q[1], x[2] + q[2]));
				const idA = at(x[0], x[1], x[2]);
				const idB = at(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
				if (a === b) mask[n++] = 0;
				else if (a) mask[n++] = idA;
				else mask[n++] = -idB;
			}
			x[d]++;
			n = 0;
			for (let j = 0; j < dims[v]; j++) for (let i = 0; i < dims[u];) {
				const c = mask[n];
				if (c !== 0) {
					let w = 1;
					while (i + w < dims[u] && mask[n + w] === c) w++;
					let h = 1;
					outer: while (j + h < dims[v]) {
						for (let k = 0; k < w; k++) if (mask[n + k + h * dims[u]] !== c) break outer;
						h++;
					}
					x[u] = i;
					x[v] = j;
					const du = [
						0,
						0,
						0
					];
					const dv = [
						0,
						0,
						0
					];
					du[u] = w * vs;
					dv[v] = h * vs;
					const block = Math.abs(c);
					const rgb = BLOCK_RGB[block] ?? BLOCK_RGB[1];
					const flip = c < 0;
					const ox = origin.x + x[0] * vs;
					const oy = origin.y + x[1] * vs;
					const oz = origin.z + x[2] * vs;
					const nx = flip ? -q[0] : q[0];
					const ny = flip ? -q[1] : q[1];
					const nz = flip ? -q[2] : q[2];
					let face = 0;
					if (d === 1) face = ny > 0 ? 0 : 1;
					else if (d === 0) face = nx > 0 ? 2 : 3;
					else face = nz > 0 ? 4 : 5;
					const jitter = .88 + uhash3(Math.floor(ox), Math.floor(oy), Math.floor(oz), block * 17) * .22;
					const p0 = [
						ox,
						oy,
						oz
					];
					const p1 = [
						ox + du[0],
						oy + du[1],
						oz + du[2]
					];
					const p2 = [
						ox + du[0] + dv[0],
						oy + du[1] + dv[1],
						oz + du[2] + dv[2]
					];
					const p3 = [
						ox + dv[0],
						oy + dv[1],
						oz + dv[2]
					];
					pushQuad(pos, nor, col, flip ? [
						p0,
						p3,
						p2,
						p1
					] : [
						p0,
						p1,
						p2,
						p3
					], nx, ny, nz, rgb, FACE_SHADE[face], jitter);
					for (let l = 0; l < h; l++) for (let k = 0; k < w; k++) mask[n + k + l * dims[u]] = 0;
					i += w;
					n += w;
				} else {
					i++;
					n++;
				}
			}
		}
	}
	if (pos.length === 0) return null;
	const geo = new BufferGeometry();
	geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
	geo.setAttribute("normal", new Float32BufferAttribute(nor, 3));
	geo.setAttribute("color", new Float32BufferAttribute(col, 3));
	geo.computeBoundingSphere();
	return geo;
}
function collectPlacements(world, cx, cz, origin, vs, data, quality, out) {
	const sx = 16;
	const sz = 16;
	for (let z = 1; z < 15; z += 2) for (let x = 1; x < 15; x += 2) for (let y = 46; y > 0; y--) {
		const b = data[x + z * sx + y * sx * sz];
		if (b !== 1 && b !== 8) continue;
		const wx = origin.x + (x + .5) * vs;
		const wy = origin.y + (y + 1) * vs;
		const wz = origin.z + (z + .5) * vs;
		const h = uhash(Math.floor(wx), Math.floor(wz), world.seed + 44);
		if (h < quality.treeDensity) out.push({
			kind: "tree",
			x: wx,
			y: wy,
			z: wz,
			rot: h * Math.PI * 2,
			scale: .7 + uhash(x, z, world.seed + 5) * 1.4
		});
		else if (h < quality.treeDensity + .08) out.push({
			kind: "fern",
			x: wx,
			y: wy,
			z: wz,
			rot: h * 9.1,
			scale: .8 + h * 1.1
		});
		break;
	}
	for (let z = 1; z < sz; z += 3) for (let x = 1; x < sx; x += 3) for (let y = 1; y < 47; y++) {
		if (data[x + z * sx + y * sx * sz] !== 9) continue;
		if (data[x + z * sx + (y + 1) * sx * sz] !== 0) continue;
		const wx = origin.x + (x + .5) * vs;
		const wy = origin.y + (y + 1) * vs;
		const wz = origin.z + (z + .5) * vs;
		if (uhash(x + cx * 16, z + cz * 16, world.seed + 2) > .55) continue;
		out.push({
			kind: "crystal",
			x: wx,
			y: wy,
			z: wz,
			rot: 0,
			scale: .6 + uhash(x, y, world.seed) * 1.6
		});
	}
	if (quality.giantTrees || quality.waterfalls) {
		const midX = origin.x + 16 * vs * .5;
		const midZ = origin.z + 16 * vs * .5;
		const isle = world.islandAt(midX, midZ);
		if (isle.present && isle.d < isle.maxR * .45) {
			if (isle.cx >= origin.x && isle.cx < origin.x + 16 * vs && isle.cz >= origin.z && isle.cz < origin.z + 16 * vs && quality.giantTrees && isle.maxR > 72 && isle.peak > 28) {
				const top = world.surfaceAt(isle.cx, isle.cz);
				out.push({
					kind: "giant",
					x: isle.cx,
					y: top,
					z: isle.cz,
					rot: isle.rnd * 6.2,
					scale: .85 + isle.rnd * .7,
					extra: isle.maxR
				});
			}
			if (quality.waterfalls && isle.base > 30 && isle.rnd > .62) {
				const ang = isle.rnd * Math.PI * 2;
				const ex = isle.cx + Math.cos(ang) * isle.maxR * .82;
				const ez = isle.cz + Math.sin(ang) * isle.maxR * .82;
				if (ex >= origin.x && ex < origin.x + 16 * vs && ez >= origin.z && ez < origin.z + 16 * vs) {
					const top = world.surfaceAt(ex, ez);
					if (top > 24) out.push({
						kind: "fall",
						x: ex,
						y: top,
						z: ez,
						rot: ang,
						scale: 1,
						extra: top
					});
				}
			}
		}
	}
}
/**
* 6DOF flight input.
*
* MOVE (vi) — view-relative translation
*   h left · l right · k up · j down
*   Space forward · Shift+Space back
*
* TILT / LOOK
*   u tilt left (yaw+roll) · o tilt right
*   i tilt forward (pitch down) · , tilt back (pitch up)
*
* Tap protocol on tilt + rotation + thrust:
*   1 tap = nudge · 2 taps = continuous · 3 taps = fast continuous
*   Hold = continuous while held
*   s = stop, 2s ease if anything was cruising
*
* A/D alias tilt left/right so chase-cam A = nose left (controls skill).
* W aliases Space (forward) for the mandatory self-test.
*/
var COMBO_MS = .42;
var HOLD_MS = .16;
var NUDGE_ANG = .18;
var CRUISE_ANG = .85;
var FAST_ANG = 1.85;
var TapAxis = class {
	taps = 0;
	lastAt = -10;
	held = false;
	holdT = 0;
	cruise = 0;
	nudge = false;
	down(t, fastOnDouble = false) {
		this.held = true;
		this.holdT = 0;
		if (t - this.lastAt < COMBO_MS) this.taps += 1;
		else this.taps = 1;
		this.lastAt = t;
		if (this.taps >= 3 || fastOnDouble && this.taps >= 2) {
			this.cruise = 2;
			this.nudge = false;
		} else if (this.taps === 2) {
			this.cruise = 1;
			this.nudge = false;
		}
	}
	up() {
		if (this.held && this.holdT < HOLD_MS && this.taps === 1 && this.cruise === 0) this.nudge = true;
		this.held = false;
		this.holdT = 0;
	}
	/** 0 none, -1 nudge pulse, 1 cruise, 2 fast. Injected holds are treated as 1. */
	sample(dt, injected) {
		if (injected) {
			this.holdT += dt;
			return 1;
		}
		if (this.held) {
			this.holdT += dt;
			if (this.holdT >= HOLD_MS) return this.cruise === 2 ? 2 : 1;
		}
		if (this.cruise === 2) return 2;
		if (this.cruise === 1) return 1;
		if (this.nudge) {
			this.nudge = false;
			return -1;
		}
		return 0;
	}
	stop() {
		this.cruise = 0;
		this.nudge = false;
	}
};
var AXIS_KEYS = {
	yawL: [
		"KeyU",
		"KeyA",
		"ArrowLeft"
	],
	yawR: [
		"KeyO",
		"KeyD",
		"ArrowRight"
	],
	pitchUp: ["Comma", "KeyM"],
	pitchDn: ["KeyI"],
	rollL: ["KeyU"],
	rollR: ["KeyO"],
	left: ["KeyH"],
	right: ["KeyL"],
	up: ["KeyK", "ArrowUp"],
	down: ["KeyJ", "ArrowDown"],
	fwd: ["Space", "KeyW"],
	back: ["Space"]
};
var InputMap = class {
	keys = /* @__PURE__ */ new Set();
	injected = /* @__PURE__ */ new Set();
	shift = false;
	injectedShift = false;
	axes = {
		yawL: new TapAxis(),
		yawR: new TapAxis(),
		pitchUp: new TapAxis(),
		pitchDn: new TapAxis(),
		rollL: new TapAxis(),
		rollR: new TapAxis(),
		left: new TapAxis(),
		right: new TapAxis(),
		up: new TapAxis(),
		down: new TapAxis(),
		fwd: new TapAxis(),
		back: new TapAxis()
	};
	stopLatched = false;
	zoomIn = false;
	zoomOut = false;
	t = 0;
	steerInject = 0;
	setKeys(codes) {
		this.injected = new Set(codes);
		this.injectedShift = codes.includes("ShiftLeft") || codes.includes("ShiftRight");
	}
	setSteer(v) {
		this.steerInject = Math.max(-1, Math.min(1, v));
	}
	bind(target) {
		const down = (e) => this.onDown(e);
		const up = (e) => this.onUp(e);
		const clear = () => {
			this.keys.clear();
			this.shift = false;
			for (const a of Object.values(this.axes)) if (a.held) a.up();
			this.zoomIn = false;
			this.zoomOut = false;
		};
		target.addEventListener("keydown", down);
		target.addEventListener("keyup", up);
		window.addEventListener("blur", clear);
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) clear();
		});
		return () => {
			target.removeEventListener("keydown", down);
			target.removeEventListener("keyup", up);
			window.removeEventListener("blur", clear);
		};
	}
	onDown(e) {
		if (e.repeat) return;
		const code = e.code;
		if (GAME_CODES.has(code)) e.preventDefault();
		this.shift = e.shiftKey;
		this.keys.add(code);
		if (code === "KeyS") {
			this.stopLatched = true;
			return;
		}
		if (code === "KeyZ") {
			if (e.shiftKey) this.zoomOut = true;
			else this.zoomIn = true;
			return;
		}
		if (code === "Space") {
			if (e.shiftKey) this.axes.back.down(this.t, true);
			else this.axes.fwd.down(this.t, true);
			return;
		}
		for (const [name, codes] of Object.entries(AXIS_KEYS)) {
			if (name === "back" || name === "fwd") continue;
			if (name === "rollL" || name === "rollR") continue;
			if (codes.includes(code)) this.axes[name].down(this.t);
		}
		if (code === "KeyU" || code === "KeyA") this.axes.rollL.down(this.t);
		if (code === "KeyO" || code === "KeyD") this.axes.rollR.down(this.t);
	}
	onUp(e) {
		const code = e.code;
		this.keys.delete(code);
		this.shift = e.shiftKey;
		if (code === "KeyZ") {
			this.zoomIn = false;
			this.zoomOut = false;
			return;
		}
		if (code === "Space") {
			this.axes.fwd.up();
			this.axes.back.up();
			return;
		}
		for (const [name, codes] of Object.entries(AXIS_KEYS)) {
			if (name === "back" || name === "fwd") continue;
			if (name === "rollL" || name === "rollR") continue;
			if (codes.includes(code)) this.axes[name].up();
		}
		if (code === "KeyU" || code === "KeyA") this.axes.rollL.up();
		if (code === "KeyO" || code === "KeyD") this.axes.rollR.up();
	}
	tick(dt) {
		this.t += dt;
	}
	held(code) {
		return this.keys.has(code) || this.injected.has(code);
	}
	sample(name, dt) {
		const codes = AXIS_KEYS[name];
		let inj = false;
		if (name === "fwd") inj = this.injected.has("Space") || this.injected.has("KeyW");
		else if (name === "back") inj = this.injected.has("Space") && this.injectedShift || this.injected.has("ShiftLeft");
		else inj = codes.some((c) => this.injected.has(c));
		return this.axes[name].sample(dt, inj);
	}
	stopAll() {
		for (const a of Object.values(this.axes)) a.stop();
		this.stopLatched = false;
	}
};
var GAME_CODES = /* @__PURE__ */ new Set([
	"Space",
	"KeyH",
	"KeyJ",
	"KeyK",
	"KeyL",
	"KeyU",
	"KeyI",
	"KeyO",
	"Comma",
	"KeyM",
	"KeyZ",
	"KeyS",
	"KeyA",
	"KeyD",
	"KeyW",
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"ArrowDown"
]);
function rateFromSample(s, nudge, cruise, fast) {
	if (s === -1) return nudge;
	if (s === 2) return fast;
	if (s === 1) return cruise;
	return 0;
}
function makeSmallTree() {
	const trunkGeo = new CylinderGeometry(.18, .32, 2.2, 5);
	trunkGeo.translate(0, 1.1, 0);
	const canopyGeo = new SphereGeometry(1.15, 6, 5);
	canopyGeo.translate(0, 2.6, 0);
	return {
		trunkGeo,
		canopyGeo
	};
}
function makeFern() {
	const geo = new ConeGeometry(.55, 1.3, 5, 1, true);
	geo.translate(0, .65, 0);
	return geo;
}
function makeCrystal() {
	const geo = new OctahedronGeometry(.45, 0);
	geo.rotateZ(.4);
	return geo;
}
function makeSpore() {
	return new SphereGeometry(.12, 5, 4);
}
function makeWaterfallTexture() {
	const c = document.createElement("canvas");
	c.width = 64;
	c.height = 256;
	const g = c.getContext("2d");
	const grad = g.createLinearGradient(0, 0, 0, 256);
	grad.addColorStop(0, "rgba(210,240,245,0.0)");
	grad.addColorStop(.08, "rgba(210,240,245,0.55)");
	grad.addColorStop(.7, "rgba(160,210,220,0.28)");
	grad.addColorStop(1, "rgba(160,210,220,0.0)");
	g.fillStyle = grad;
	g.fillRect(0, 0, 64, 256);
	g.strokeStyle = "rgba(255,255,255,0.28)";
	g.lineWidth = 2;
	for (let i = 0; i < 9; i++) {
		g.beginPath();
		const x = 6 + i * 6;
		g.moveTo(x, 0);
		for (let y = 0; y < 256; y += 8) g.lineTo(x + Math.sin(y * .08 + i) * 3, y);
		g.stroke();
	}
	const tex = new CanvasTexture(c);
	tex.wrapS = RepeatWrapping;
	tex.wrapT = RepeatWrapping;
	return tex;
}
function makeGiantTree(seed, scale) {
	const rng = mulberry32(seed >>> 0);
	const g = new Group();
	const woodMat = new MeshLambertMaterial({ color: 4862756 });
	const leafMat = new MeshLambertMaterial({
		color: 2059077,
		flatShading: true
	});
	const glowMat = new MeshLambertMaterial({
		color: 8315090,
		emissive: 1731170,
		emissiveIntensity: .85
	});
	const h = 38 * scale;
	const trunkR = 2.4 * scale;
	const trunk = new Mesh(new CylinderGeometry(trunkR * .45, trunkR, h, 8), woodMat);
	trunk.position.y = h * .5;
	trunk.castShadow = true;
	g.add(trunk);
	for (let i = 0; i < 7; i++) {
		const a = i / 7 * Math.PI * 2 + rng() * .4;
		const root = new Mesh(new CylinderGeometry(.18 * scale, .55 * scale, h * .55, 5), woodMat);
		root.position.set(Math.cos(a) * trunkR * 1.1, h * .22, Math.sin(a) * trunkR * 1.1);
		root.rotation.z = Math.cos(a) * .45;
		root.rotation.x = Math.sin(a) * .45;
		g.add(root);
	}
	const canopyY = h * .78;
	const blobs = 10 + Math.floor(rng() * 6);
	for (let i = 0; i < blobs; i++) {
		const a = rng() * Math.PI * 2;
		const r = (4 + rng() * 10) * scale;
		const s = (4.5 + rng() * 6) * scale;
		const leaf = new Mesh(new IcosahedronGeometry(s, 0), leafMat);
		leaf.position.set(Math.cos(a) * r, canopyY + (rng() - .4) * 8 * scale, Math.sin(a) * r);
		leaf.rotation.set(rng() * .6, rng() * 2, rng() * .6);
		leaf.castShadow = true;
		g.add(leaf);
	}
	for (let i = 0; i < 6; i++) {
		const a = i / 6 * Math.PI * 2;
		const bough = new Mesh(new CylinderGeometry(.22 * scale, .55 * scale, 12 * scale, 5), woodMat);
		bough.position.set(Math.cos(a) * 5 * scale, canopyY - 4 * scale, Math.sin(a) * 5 * scale);
		bough.rotation.z = Math.cos(a) * 1.1;
		bough.rotation.x = -Math.sin(a) * 1.1;
		g.add(bough);
	}
	for (let i = 0; i < 14; i++) {
		const a = rng() * Math.PI * 2;
		const r = (3 + rng() * 9) * scale;
		const orb = new Mesh(new SphereGeometry(.28 * scale, 5, 4), glowMat);
		orb.position.set(Math.cos(a) * r, canopyY - 2 * scale - rng() * 8 * scale, Math.sin(a) * r);
		g.add(orb);
	}
	g.traverse((o) => {
		o.receiveShadow = true;
	});
	return g;
}
/** Compressed-air Tesla-like roadster — tiny nozzles on every axis. */
function makeRoadster() {
	const g = new Group();
	const body = new MeshPhongMaterial({
		color: 11805464,
		shininess: 110,
		specular: 16747130
	});
	const dark = new MeshPhongMaterial({
		color: 1711134,
		shininess: 40,
		specular: 4473928
	});
	const silver = new MeshPhongMaterial({
		color: 12961996,
		shininess: 90,
		specular: 15264494
	});
	const glass = new MeshPhongMaterial({
		color: 9357524,
		transparent: true,
		opacity: .52,
		shininess: 160,
		specular: 16777215
	});
	const glow = new MeshPhongMaterial({
		color: 15267583,
		emissive: 6992084,
		emissiveIntensity: .95,
		shininess: 20
	});
	const tail = new MeshPhongMaterial({
		color: 16726570,
		emissive: 11147280,
		emissiveIntensity: .7
	});
	const hull = new Mesh(new BoxGeometry(1.42, .42, 3.15), body);
	hull.position.y = .38;
	g.add(hull);
	const nose = new Mesh(new BoxGeometry(1.28, .3, .85), body);
	nose.position.set(0, .3, -1.82);
	g.add(nose);
	const splitter = new Mesh(new BoxGeometry(1.36, .06, .4), dark);
	splitter.position.set(0, .14, -2.12);
	g.add(splitter);
	const cabin = new Mesh(new BoxGeometry(1.18, .38, 1.15), glass);
	cabin.position.set(0, .68, -.12);
	g.add(cabin);
	const roof = new Mesh(new BoxGeometry(1.12, .05, 1.05), body);
	roof.position.set(0, .88, -.08);
	g.add(roof);
	const belt = new Mesh(new BoxGeometry(1.46, .05, 2.9), silver);
	belt.position.y = .58;
	g.add(belt);
	const spoiler = new Mesh(new BoxGeometry(1.28, .06, .32), dark);
	spoiler.position.set(0, .62, 1.52);
	g.add(spoiler);
	const diffuser = new Mesh(new BoxGeometry(1.1, .16, .28), dark);
	diffuser.position.set(0, .18, 1.62);
	g.add(diffuser);
	for (const x of [-.62, .62]) for (const z of [-1.05, 1.12]) {
		const wheel = new Mesh(new CylinderGeometry(.28, .28, .22, 14), dark);
		wheel.rotation.z = Math.PI / 2;
		wheel.position.set(x, .28, z);
		g.add(wheel);
		const rim = new Mesh(new CylinderGeometry(.16, .16, .24, 10), silver);
		rim.rotation.z = Math.PI / 2;
		rim.position.set(x, .28, z);
		g.add(rim);
	}
	const lampL = new Mesh(new SphereGeometry(.09, 8, 6), glow);
	lampL.position.set(-.42, .34, -2.22);
	g.add(lampL);
	const lampR = lampL.clone();
	lampR.position.x = .42;
	g.add(lampR);
	const tailL = new Mesh(new BoxGeometry(.28, .08, .06), tail);
	tailL.position.set(-.48, .42, 1.6);
	g.add(tailL);
	const tailR = tailL.clone();
	tailR.position.x = .48;
	g.add(tailR);
	const mkNoz = (x, y, z, ax) => {
		const n = new Object3D();
		n.position.set(x, y, z);
		const vis = new Mesh(new CylinderGeometry(.055, .085, .16, 8), silver);
		const core = new Mesh(new CylinderGeometry(.03, .03, .1, 6), glow);
		if (ax === "z") {
			vis.rotation.x = Math.PI / 2;
			core.rotation.x = Math.PI / 2;
		} else if (ax === "x") {
			vis.rotation.z = Math.PI / 2;
			core.rotation.z = Math.PI / 2;
		}
		n.add(vis);
		n.add(core);
		g.add(n);
		return n;
	};
	const nozzles = {
		fwd: mkNoz(0, .26, 1.72, "z"),
		back: mkNoz(0, .26, -2.28, "z"),
		left: mkNoz(-.78, .34, .15, "x"),
		right: mkNoz(.78, .34, .15, "x"),
		up: mkNoz(0, .92, .4, "y"),
		down: mkNoz(0, .1, .25, "y")
	};
	g.scale.setScalar(1.85);
	const nameplate = makeNameplate("Guest");
	g.add(nameplate);
	return {
		group: g,
		nozzles,
		nameplate
	};
}
/** Vanity-plate text: X handles keep @, guests become GUEST N. */
function plateLabel(text) {
	const t = text.trim();
	if (!t) return "GUEST";
	if (t.startsWith("@")) return t.slice(0, 14);
	const g = t.match(/^guest\s*(\d+)$/i);
	if (g) return `GUEST ${g[1]}`;
	if (!/\s/.test(t) && t.length <= 14) return `@${t}`;
	return t.slice(0, 14).toUpperCase();
}
function drawPlateTexture(text) {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 320;
	const g = c.getContext("2d");
	g.fillStyle = "#1a2623";
	g.fillRect(0, 0, 1024, 320);
	g.fillStyle = "#0c1614";
	g.beginPath();
	g.roundRect(18, 18, 988, 284, 22);
	g.fill();
	g.strokeStyle = "#d5d0c8";
	g.lineWidth = 10;
	g.beginPath();
	g.roundRect(28, 28, 968, 264, 16);
	g.stroke();
	g.strokeStyle = "rgba(232, 228, 220, 0.35)";
	g.lineWidth = 3;
	g.beginPath();
	g.roundRect(42, 42, 940, 236, 12);
	g.stroke();
	g.fillStyle = "#9aa8a3";
	g.font = "600 36px Outfit, Segoe UI, sans-serif";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText("FUTURELIFE", 512, 78);
	const label = plateLabel(text);
	const size = label.length > 10 ? 86 : label.length > 7 ? 104 : 124;
	g.fillStyle = "#f3eee4";
	g.font = `700 ${size}px Outfit, Segoe UI, sans-serif`;
	g.fillText(label, 512, 168);
	g.fillStyle = "#c5cec8";
	g.font = "600 28px Outfit, Segoe UI, sans-serif";
	g.fillText("LOUISIANA  ·  X", 512, 248);
	const tex = new CanvasTexture(c);
	tex.colorSpace = SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}
function makeNameplate(text) {
	const g = new Group();
	const tex = drawPlateTexture(text);
	const mat = new MeshBasicMaterial({
		map: tex,
		toneMapped: false
	});
	const silver = new MeshPhongMaterial({
		color: 12961996,
		shininess: 90,
		specular: 15264494
	});
	const geo = new PlaneGeometry(1.72, .52);
	const frameGeo = new PlaneGeometry(1.84, .62);
	const rearFrame = new Mesh(frameGeo, silver);
	rearFrame.position.set(0, .82, 1.42);
	rearFrame.rotation.x = -.42;
	g.add(rearFrame);
	const rear = new Mesh(geo, mat);
	rear.position.set(0, .82, 1.45);
	rear.rotation.x = -.42;
	rear.userData.plate = true;
	g.add(rear);
	const frontFrame = new Mesh(frameGeo, silver);
	frontFrame.position.set(0, .38, -2.24);
	frontFrame.rotation.y = Math.PI;
	g.add(frontFrame);
	const front = new Mesh(geo, mat);
	front.position.set(0, .38, -2.27);
	front.rotation.y = Math.PI;
	front.userData.plate = true;
	g.add(front);
	g.userData.label = plateLabel(text);
	g.userData.plateMat = mat;
	return g;
}
function paintNameplate(root, text) {
	const label = plateLabel(text);
	if (root.userData.label === label) return;
	root.userData.label = label;
	const next = drawPlateTexture(label);
	const mat = root.userData.plateMat;
	if (mat) {
		const prev = mat.map;
		mat.map = next;
		mat.needsUpdate = true;
		prev?.dispose();
		return;
	}
	const prevSprite = root.material;
	if (prevSprite && "map" in prevSprite) {
		const m = prevSprite;
		const prev = m.map;
		m.map = next;
		m.needsUpdate = true;
		prev?.dispose();
	}
}
var SKY_VERT = `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
var SKY_FRAG = `
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
function addSky(scene) {
	const uniforms = {
		uZenith: { value: new Color(WORLD_HEX.skyZenith) },
		uHorizon: { value: new Color(WORLD_HEX.skyHorizon) },
		uNadir: { value: new Color(797234) },
		uSunDir: { value: new Vector3(.45, .62, .35).normalize() },
		uSunColor: { value: new Color(WORLD_HEX.sun) }
	};
	const mat = new ShaderMaterial({
		uniforms,
		vertexShader: SKY_VERT,
		fragmentShader: SKY_FRAG,
		side: 1,
		depthWrite: false
	});
	const mesh = new Mesh(new SphereGeometry(3600, 24, 16), mat);
	mesh.frustumCulled = false;
	scene.add(mesh);
	const moon = new Mesh(new SphereGeometry(22, 16, 12), new MeshLambertMaterial({ color: 13223096 }));
	moon.position.set(620, 340, -980);
	scene.add(moon);
	return {
		mesh,
		uniforms,
		planet: moon
	};
}
function addLights(scene, shadows) {
	const hemi = new HemisphereLight(WORLD_HEX.ambientSky, WORLD_HEX.ambientGround, .9);
	scene.add(hemi);
	const sun = new DirectionalLight(WORLD_HEX.sun, 1.85);
	sun.position.set(40, 160, 120);
	sun.castShadow = shadows;
	if (shadows) {
		sun.shadow.mapSize.set(1024, 1024);
		const s = 180;
		sun.shadow.camera.left = -180;
		sun.shadow.camera.right = s;
		sun.shadow.camera.top = s;
		sun.shadow.camera.bottom = -180;
		sun.shadow.camera.near = 10;
		sun.shadow.camera.far = 420;
		sun.shadow.bias = -8e-4;
	}
	scene.add(sun);
	const fill = new DirectionalLight(8304816, .45);
	fill.position.set(-40, 50, -40);
	scene.add(fill);
	const gulf = new DirectionalLight(16770754, .75);
	gulf.position.set(10, 55, 90);
	scene.add(gulf);
	return {
		hemi,
		sun
	};
}
/** Gulf-coast origin: north pole tangent, looking −Z from spawn. */
var STARBASE_ORIGIN = {
	x: 0,
	y: 0,
	z: -28
};
/** Billboard center in local (root) space. Front of the words faces +Z (south). */
var SIGN_LOCAL = {
	x: 0,
	y: 14,
	z: 42
};
/** World-space center of the STARBASE LOUISIANA lettering. */
function signWorld() {
	return {
		x: STARBASE_ORIGIN.x + SIGN_LOCAL.x,
		y: STARBASE_ORIGIN.y + SIGN_LOCAL.y,
		z: STARBASE_ORIGIN.z + SIGN_LOCAL.z
	};
}
function box(mat, w, h, d, x, y, z) {
	const m = new Mesh(new BoxGeometry(w, h, d), mat);
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	return m;
}
function makeMats() {
	return {
		steel: new MeshPhongMaterial({
			color: 11055286,
			shininess: 90,
			specular: 13160662
		}),
		steelDark: new MeshPhongMaterial({
			color: 4015178,
			shininess: 40,
			specular: 6713464
		}),
		stainless: new MeshPhongMaterial({
			color: 15265007,
			shininess: 180,
			specular: 16777215
		}),
		concrete: new MeshLambertMaterial({ color: 10133658 }),
		white: new MeshLambertMaterial({ color: 15265e3 }),
		rust: new MeshLambertMaterial({ color: 7033668 }),
		flame: new MeshLambertMaterial({ color: 2761760 }),
		black: new MeshLambertMaterial({ color: 1447962 }),
		light: new MeshPhongMaterial({
			color: 16773576,
			emissive: 13408580,
			emissiveIntensity: .95,
			shininess: 20
		}),
		marsh: new MeshLambertMaterial({ color: 4020794 }),
		asphalt: new MeshLambertMaterial({ color: 3815996 }),
		stripe: new MeshLambertMaterial({ color: 13943946 })
	};
}
/** Stainless Starship stack (booster + ship + flaps + grid fins). */
function makeStarship(mats, stacked) {
	const g = new Group();
	const s = mats.stainless;
	const b = mats.black;
	const hBoost = stacked ? 17.4 : 0;
	if (stacked) {
		const boost = new Mesh(new CylinderGeometry(1.28, 1.38, hBoost, 18), s);
		boost.position.y = hBoost / 2;
		boost.castShadow = true;
		g.add(boost);
		const skirt = new Mesh(new CylinderGeometry(1.5, 1.62, 1.1, 12), mats.steelDark);
		skirt.position.y = .55;
		g.add(skirt);
		for (let i = 0; i < 4; i++) {
			const a = i / 4 * Math.PI * 2 + .4;
			const fin = box(mats.steel, 1.8, .12, 1.1, Math.cos(a) * 1.45, 14.2, Math.sin(a) * 1.45);
			fin.lookAt(0, 14.2, 0);
			g.add(fin);
		}
	}
	const shipH = 12.6;
	const ship = new Mesh(new CylinderGeometry(1.18, 1.28, shipH, 18), s);
	ship.position.y = hBoost + shipH / 2;
	ship.castShadow = true;
	g.add(ship);
	const nose = new Mesh(new ConeGeometry(1.18, 5.4, 18), s);
	nose.position.y = hBoost + shipH + 2.7;
	nose.castShadow = true;
	g.add(nose);
	const cap = new Mesh(new CylinderGeometry(.22, .22, .8, 8), b);
	cap.position.y = hBoost + shipH + 5.5;
	g.add(cap);
	const flapY = hBoost + 8.4;
	for (const sx of [-1, 1]) {
		const flap = box(s, .12, 4.8, 2.4, sx * 1.35, flapY, .15);
		flap.rotation.z = sx * .18;
		g.add(flap);
	}
	for (const sx of [-1, 1]) {
		const flap = box(s, .12, 3.2, 1.6, sx * 1.32, hBoost + 3.2, .1);
		flap.rotation.z = sx * .22;
		g.add(flap);
	}
	const heat = new Mesh(new CylinderGeometry(1.2, 1.22, shipH * .7, 18, 1, true), mats.black);
	heat.position.set(.04, hBoost + shipH * .45, 0);
	heat.scale.x = .92;
	g.add(heat);
	return g;
}
/** Mechazilla-style catch tower with chopsticks, carriage, QD arm. */
function makeTower(mats, height) {
	const g = new Group();
	const s = mats.steel;
	const sd = mats.steelDark;
	for (const sx of [-1.35, 1.35]) for (const sz of [-1.35, 1.35]) g.add(box(s, .55, height, .55, sx, height / 2, sz));
	for (let i = 0; i < 8; i++) {
		const y = 4 + i * (height / 9);
		g.add(box(sd, 3.1, .28, .28, 0, y, -1.35));
		g.add(box(sd, 3.1, .28, .28, 0, y, 1.35));
		g.add(box(sd, .28, .28, 3.1, -1.35, y, 0));
		g.add(box(sd, .28, .28, 3.1, 1.35, y, 0));
	}
	g.add(box(sd, 3.6, 1.4, 3.6, 0, height + .5, 0));
	const armY = height * .72;
	const armL = box(s, .7, .7, height * .62, -2.55, armY, 4.2);
	armL.rotation.y = .08;
	g.add(armL);
	const armR = box(s, .7, .7, height * .62, 2.55, armY, 4.2);
	armR.rotation.y = -.08;
	g.add(armR);
	g.add(box(sd, 6.2, 1.8, 2.6, 0, armY - 2.4, .6));
	const qd = box(s, .45, .45, 9.5, 3.1, height * .28, 4.4);
	qd.rotation.y = .32;
	g.add(qd);
	const hose = new Mesh(new CylinderGeometry(.22, .22, height * .85, 6), s);
	hose.position.set(-1.9, height * .42, 1.7);
	g.add(hose);
	return g;
}
function makePadPair(mats, spacing, towerH, ships) {
	const g = new Group();
	const { concrete: c, flame: f, white: w, rust: r } = mats;
	g.add(box(c, 44, 1.6, 34, 0, .8, 2));
	g.add(box(f, 12, 2.4, 22, 0, -.2, 6));
	g.add(box(mats.steelDark, 13, .4, 1.2, 0, 1.5, 16));
	const placePad = (x, withShip) => {
		const olm = new Mesh(new CylinderGeometry(4.4, 5.6, 3.4, 10), mats.steelDark);
		olm.position.set(x, 2.6, 0);
		olm.castShadow = true;
		g.add(olm);
		const t = makeTower(mats, towerH);
		t.position.set(x, 1.6, -2.2);
		g.add(t);
		if (withShip) {
			const ship = makeStarship(mats, true);
			ship.position.set(x, 4.2, .4);
			g.add(ship);
		}
	};
	placePad(-spacing / 2, ships[0]);
	placePad(spacing / 2, ships[1]);
	for (let i = 0; i < 5; i++) {
		const tank = new Mesh(new CylinderGeometry(1.7, 1.7, 8 + i % 2 * 1.4, 12), i % 2 ? r : w);
		tank.position.set(-18 + i * 3.6, 5.1, 13);
		tank.castShadow = true;
		g.add(tank);
	}
	const ch4 = new Mesh(new CylinderGeometry(2.3, 2.3, 6.2, 12), r);
	ch4.position.set(16, 4.2, 13);
	g.add(ch4);
	for (const sx of [-18, 18]) {
		g.add(box(mats.steel, .28, 11, .28, sx, 6.2, -14));
		const lamp = new Mesh(new SphereGeometry(.42, 8, 6), mats.light);
		lamp.position.set(sx, 11.4, -14);
		g.add(lamp);
	}
	return g;
}
function makeSign(mats) {
	const g = new Group();
	g.position.set(SIGN_LOCAL.x, 0, SIGN_LOCAL.z);
	g.add(box(mats.steelDark, .7, 15.2, .7, -19.5, 7.6, 0));
	g.add(box(mats.steelDark, .7, 15.2, .7, 19.5, 7.6, 0));
	g.add(box(mats.steel, 44.5, .55, 1.4, 0, 19.6, .15));
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 256;
	const ctx = c.getContext("2d");
	ctx.fillStyle = "#d8c078";
	ctx.fillRect(0, 0, 1024, 256);
	ctx.fillStyle = "#1a1810";
	ctx.font = "700 64px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("STARBASE LOUISIANA", 512, 110);
	ctx.font = "500 28px sans-serif";
	ctx.fillText("VERMILION PARISH  ·  5 COMPLEXES  ·  10 TOWERS", 512, 175);
	const tex = new CanvasTexture(c);
	tex.colorSpace = SRGBColorSpace;
	const mesh = new Mesh(new PlaneGeometry(44, 11), new MeshBasicMaterial({
		map: tex,
		side: 2,
		toneMapped: false
	}));
	mesh.position.set(0, SIGN_LOCAL.y, .4);
	mesh.rotation.x = -.22;
	g.add(mesh);
	return g;
}
/**
* Starbase Louisiana: five complexes × two catch towers (10 pads),
* Vermilion Parish Gulf coast layout from the Aug 2026 announcement.
*/
function makeStarbase() {
	const root = new Group();
	root.position.set(STARBASE_ORIGIN.x, STARBASE_ORIGIN.y, STARBASE_ORIGIN.z);
	const mats = makeMats();
	root.add(box(mats.concrete, 248, 1.2, 78, 0, .5, 8));
	root.add(box(mats.marsh, 270, .7, 48, 0, .25, 38));
	root.add(box(mats.marsh, 80, .5, 90, -150, .2, 10));
	root.add(box(mats.marsh, 80, .5, 90, 150, .2, 10));
	const gap = 46;
	const ships = [
		[true, true],
		[true, false],
		[false, true],
		[true, true],
		[false, false]
	];
	for (let i = 0; i < 5; i++) {
		const pad = makePadPair(mats, 18, 38 + i % 2 * 3, ships[i]);
		pad.position.set((i - 2) * gap, 1.2, 0);
		root.add(pad);
	}
	root.add(box(mats.steelDark, 56, 16, 26, -118, 9, 22));
	root.add(box(mats.steel, 56, .5, 26, -118, 17.2, 22));
	root.add(box(mats.steel, 18, 26, 18, -118, 14, 4));
	for (let i = 0; i < 6; i++) root.add(box(mats.light, 4, 2.2, .3, -140 + i * 8.4, 8, 35.1));
	root.add(box(mats.asphalt, 236, .28, 5.2, 0, 1.22, 26));
	root.add(box(mats.stripe, 236, .04, .18, 0, 1.38, 26));
	root.add(makeSign(mats));
	root.traverse((o) => {
		if (o instanceof Mesh) {
			o.castShadow = true;
			o.receiveShadow = true;
		}
	});
	return root;
}
var STARBASE_POI = {
	id: "starbase-la",
	kind: "sight",
	name: "Starbase Louisiana",
	x: STARBASE_ORIGIN.x,
	y: STARBASE_ORIGIN.y + 22,
	z: STARBASE_ORIGIN.z
};
var AirRipples = class {
	group = new Group();
	pool = [];
	geo;
	mat;
	acc = 0;
	constructor() {
		this.geo = new RingGeometry(.1, .2, 20);
		this.mat = new MeshBasicMaterial({
			color: 14087423,
			transparent: true,
			opacity: .55,
			side: 2,
			depthWrite: false,
			blending: 2
		});
		for (let i = 0; i < 48; i++) {
			const mesh = new Mesh(this.geo, this.mat.clone());
			mesh.visible = false;
			this.group.add(mesh);
			this.pool.push({
				mesh,
				age: 0,
				life: 0,
				speed: 1
			});
		}
	}
	/**
	* localWish is in craft space: +Z back, −Z forward, +X right, +Y up.
	* Exhaust leaves the nozzle opposite the wish.
	*/
	pulse(craft, localWish, nozzles, dt) {
		const mag = localWish.length();
		if (mag < .15) return;
		this.acc += dt;
		if (this.acc < .055) return;
		this.acc = 0;
		const ax = Math.abs(localWish.x);
		const ay = Math.abs(localWish.y);
		const az = Math.abs(localWish.z);
		let noz;
		if (az >= ax && az >= ay) noz = localWish.z < 0 ? nozzles.fwd : nozzles.back;
		else if (ax >= ay) noz = localWish.x > 0 ? nozzles.left : nozzles.right;
		else noz = localWish.y > 0 ? nozzles.down : nozzles.up;
		const origin = new Vector3();
		noz.getWorldPosition(origin);
		const worldDir = localWish.clone().normalize().transformDirection(craft.matrixWorld);
		this.spawn(origin, worldDir, mag);
		if (mag > 20) {
			const side = origin.clone().add(new Vector3(.12, .04, 0));
			this.spawn(side, worldDir, mag);
		}
	}
	spawn(origin, dir, mag) {
		const slot = this.pool.find((r) => !r.mesh.visible);
		if (!slot) return;
		slot.age = 0;
		slot.life = .58;
		slot.speed = 5 + mag * 3.2;
		slot.mesh.visible = true;
		slot.mesh.position.copy(origin);
		slot.mesh.lookAt(origin.clone().add(dir));
		slot.mesh.scale.setScalar(.35);
		const m = slot.mesh.material;
		m.opacity = .7;
	}
	update(dt) {
		for (const r of this.pool) {
			if (!r.mesh.visible) continue;
			r.age += dt;
			const t = r.age / r.life;
			if (t >= 1) {
				r.mesh.visible = false;
				continue;
			}
			r.mesh.scale.setScalar(.35 + t * 3.6);
			r.mesh.translateZ(-r.speed * dt);
			r.mesh.material.opacity = .7 * (1 - t) * (1 - t);
		}
	}
	dispose() {
		this.geo.dispose();
		this.mat.dispose();
		for (const r of this.pool) r.mesh.material.dispose();
	}
};
/** Roadster length in world units (hull × group scale). */
var CAR_LEN = 6.2;
var CAR_SEP = 5.8;
var PAD_GAP = 46;
var TOWER_HALF = 9;
var TOWER_LOCAL_Z = -2.2;
/** Front-row radius from the sign. Deeper rows step one car-length out. */
var R0 = 46;
var ROW_STEP = CAR_LEN * 1.25;
var ELEV0 = .08;
var RAKE = .18;
var STALLS = [
	7,
	9,
	11
];
/** World position of one of the 10 catch towers, starting at complex 3. */
function towerAt(index) {
	const i = (index % 10 + 10) % 10;
	const complex = (3 + Math.floor(i / 2)) % 5;
	const side = i % 2 === 0 ? -1 : 1;
	return {
		x: (complex - 2) * PAD_GAP + side * TOWER_HALF,
		y: 22,
		z: STARBASE_ORIGIN.z + TOWER_LOCAL_Z
	};
}
function starbaseDeckY(x, z) {
	const lx = x - STARBASE_ORIGIN.x;
	const lz = z - STARBASE_ORIGIN.z;
	if (Math.abs(lx) < 128 && Math.abs(lz - 8) < 42) return 7.2;
	if (Math.abs(lx) < 140 && Math.abs(lz - 38) < 28) return 5.4;
	return 0;
}
function minClearanceY(x, z) {
	const r2 = x * x + z * z;
	let surf = 2.4;
	if (r2 < 462396) surf = -680 + Math.sqrt(462400 - r2);
	return Math.max(surf + 2.6, starbaseDeckY(x, z), 4.2);
}
function tooCloseToTower(x, y, z) {
	for (let i = 0; i < 10; i++) {
		const t = towerAt(i);
		const dx = x - t.x;
		const dz = z - t.z;
		if (dx * dx + dz * dz < 121 && y < t.y + 16) return true;
	}
	return false;
}
function lookAtSign(x, y, z) {
	const s = signWorld();
	const dx = s.x - x;
	const dy = s.y - y;
	const dz = s.z - z;
	const len = Math.hypot(dx, dy, dz) || 1;
	return {
		yaw: Math.atan2(-dx, -dz),
		pitch: Math.asin(Math.max(-.85, Math.min(.85, dy / len)))
	};
}
/** Center-out stall offsets so the first joiner gets the dead-center seat. */
function stallOrder(n) {
	const out = [0];
	for (let k = 1; out.length < n; k++) {
		out.push(k);
		if (out.length < n) out.push(-k);
	}
	return out;
}
/**
* Three-row amphitheater on a sphere centered on the sign. Every slot is the
* same radial distance as its row (equal distance from the lettering), higher
* rows rake up and look down, and odd rows stagger a half-stall so rear
* drivers see through the cars ahead to STARBASE LOUISIANA — never the back
* of the board.
*/
function packPoses() {
	const sign = signWorld();
	const poses = [];
	for (let layer = 2; layer >= 0; layer--) {
		const n = STALLS[layer];
		const R = R0 + layer * ROW_STEP;
		const elev = ELEV0 + layer * RAKE;
		const ce = Math.cos(elev);
		const se = Math.sin(elev);
		const stagger = layer % 2 === 1 ? .5 : 0;
		const dAz = CAR_LEN / Math.max(8, R * ce);
		for (const stall of stallOrder(n)) {
			const az = (stall + stagger) * dAz;
			const x = sign.x + R * ce * Math.sin(az);
			const y = sign.y + R * se;
			const z = sign.z + R * ce * Math.cos(az);
			if (y < minClearanceY(x, z) + .4) continue;
			if (tooCloseToTower(x, y, z)) continue;
			const lx = x - STARBASE_ORIGIN.x;
			const lz = z - STARBASE_ORIGIN.z;
			if (Math.hypot(lx - SIGN_LOCAL.x, lz - SIGN_LOCAL.z) < 18 && Math.abs(y - sign.y) < 10) continue;
			poses.push({
				x,
				y,
				z,
				...lookAtSign(x, y, z)
			});
		}
	}
	if (poses.length === 0) {
		const y = Math.max(sign.y, minClearanceY(sign.x, sign.z + R0));
		poses.push({
			x: sign.x,
			y,
			z: sign.z + R0,
			...lookAtSign(sign.x, y, sign.z + R0)
		});
	}
	return poses;
}
var PACK = packPoses();
function poseForSpawn(spawnIdx) {
	return PACK[(Math.trunc(spawnIdx) % PACK.length + PACK.length) % PACK.length];
}
var BRAKE_SEC = 2;
var _fwd = new Vector3();
var _right = new Vector3();
var _up = new Vector3();
var _wish = new Vector3();
var _tmp = new Vector3();
var _quat = new Quaternion();
var _euler = new Euler(0, 0, 0, "YXZ");
new Matrix4();
var _look = new Vector3();
var Engine = class {
	renderer;
	scene = new Scene();
	camera;
	input = new InputMap();
	craft;
	roadster;
	world;
	quality;
	seed;
	playing = false;
	pos = new Vector3(0, 80, 40);
	vel = new Vector3();
	yaw = 0;
	pitch = -.12;
	roll = 0;
	yawRate = 0;
	pitchRate = 0;
	rollRate = 0;
	followDist = 18;
	brakingT = 0;
	detail = 0;
	timer = new Timer();
	unbind = null;
	raf = 0;
	disposed = false;
	hudAcc = 0;
	onHud;
	chunks = /* @__PURE__ */ new Map();
	queue = [];
	solidMat;
	waterMat;
	lights;
	sky;
	planet;
	ripples;
	remotes = /* @__PURE__ */ new Map();
	frameCount = 0;
	workMs = 0;
	statsT = 0;
	fpsOut = 0;
	cpuOut = 0;
	hudPeriod = 1;
	localWish = new Vector3();
	guide = null;
	spawnIdx = 0;
	lot = /* @__PURE__ */ new Map();
	treeTrunk;
	treeCanopy;
	ferns;
	crystals;
	spores;
	giants = /* @__PURE__ */ new Map();
	falls = /* @__PURE__ */ new Map();
	fallTex;
	instancesDirty = false;
	sporeOffsets;
	dummy = new Object3D();
	touch = {
		x: 0,
		y: 0,
		lookX: 0,
		lookY: 0,
		fwd: 0,
		back: 0
	};
	constructor(canvas, onHud, detail) {
		this.onHud = onHud;
		this.detail = detail;
		this.quality = qualityFromDetail(detail);
		this.seed = (Date.now() ^ Math.random() * 4294967295) >>> 0;
		this.world = new World(this.seed, this.quality.voxelSize);
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: detail > .25,
			alpha: false,
			powerPreference: "high-performance"
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, detail > .4 ? 1.5 : 1));
		this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = 4;
		this.renderer.toneMappingExposure = 1.22;
		this.renderer.shadowMap.enabled = this.quality.shadows;
		this.renderer.shadowMap.type = 2;
		this.camera = new PerspectiveCamera(62, 1, .4, 4200);
		this.scene.background = new Color(WORLD_HEX.fog);
		this.scene.fog = new Fog(WORLD_HEX.fog, 280, 2800);
		this.solidMat = new MeshLambertMaterial({ vertexColors: true });
		this.waterMat = new MeshLambertMaterial({
			vertexColors: true,
			transparent: true,
			opacity: .58,
			depthWrite: false
		});
		this.sky = addSky(this.scene);
		this.lights = addLights(this.scene, this.quality.shadows);
		this.planet = addPlanet(this.scene);
		this.scene.add(makeStarbase());
		this.dressLot();
		const { trunkGeo, canopyGeo } = makeSmallTree();
		const trunkMat = new MeshLambertMaterial({ color: 4862756 });
		const canopyMat = new MeshLambertMaterial({ color: 2059077 });
		this.treeTrunk = new InstancedMesh(trunkGeo, trunkMat, 1400);
		this.treeCanopy = new InstancedMesh(canopyGeo, canopyMat, 1400);
		this.ferns = new InstancedMesh(makeFern(), new MeshLambertMaterial({
			color: 2976335,
			side: 2
		}), 900);
		this.crystals = new InstancedMesh(makeCrystal(), new MeshLambertMaterial({
			color: 8315090,
			emissive: 1731170,
			emissiveIntensity: .7
		}), 500);
		this.spores = new InstancedMesh(makeSpore(), new MeshLambertMaterial({
			color: 11075572,
			emissive: 3844252,
			emissiveIntensity: .9,
			transparent: true,
			opacity: .85
		}), 180);
		for (const m of [
			this.treeTrunk,
			this.treeCanopy,
			this.ferns,
			this.crystals,
			this.spores
		]) {
			m.frustumCulled = false;
			m.instanceMatrix.setUsage(DynamicDrawUsage);
			this.scene.add(m);
		}
		this.treeTrunk.count = 0;
		this.treeCanopy.count = 0;
		this.ferns.count = 0;
		this.crystals.count = 0;
		this.spores.count = 180;
		this.sporeOffsets = /* @__PURE__ */ new Float32Array(540);
		for (let i = 0; i < 180; i++) {
			this.sporeOffsets[i * 3] = (Math.random() - .5) * 70;
			this.sporeOffsets[i * 3 + 1] = (Math.random() - .5) * 40;
			this.sporeOffsets[i * 3 + 2] = (Math.random() - .5) * 70;
		}
		this.fallTex = makeWaterfallTexture();
		this.roadster = makeRoadster();
		this.craft = this.roadster.group;
		this.scene.add(this.craft);
		this.ripples = new AirRipples();
		this.scene.add(this.ripples.group);
		this.placeSpawn();
		this.camera.position.copy(this.pos).add(new Vector3(0, 6, 18));
		this.unbind = this.input.bind(window);
		this.resize();
		window.addEventListener("resize", this.resize);
		this.timer.connect(document);
		this.primeChunks();
		this.installProbe();
	}
	setTouch(t) {
		Object.assign(this.touch, t);
	}
	snapshot() {
		return {
			x: this.pos.x,
			y: this.pos.y,
			z: this.pos.z,
			yaw: this.yaw,
			pitch: this.pitch,
			roll: this.roll
		};
	}
	applySpawn(idx) {
		this.spawnIdx = Math.max(0, Math.trunc(idx));
		const p = poseForSpawn(this.spawnIdx);
		this.pos.set(p.x, p.y, p.z);
		this.yaw = p.yaw;
		this.pitch = p.pitch;
		this.followDist = 18;
		this.camera.position.copy(this.pos).add(new Vector3(0, 6, 18));
		this.hideLotStall(this.spawnIdx);
	}
	dressLot() {
		for (const i of [
			8,
			9,
			10,
			12,
			14,
			16,
			18,
			20,
			22,
			24
		]) {
			const p = poseForSpawn(i);
			const r = makeRoadster();
			r.group.traverse((o) => {
				if (o instanceof Mesh && o.material instanceof MeshPhongMaterial) {
					if (o.material.color.getHex() === 11805464) o.material.color.setHex(4015940);
				}
			});
			paintNameplate(r.nameplate, "• • •");
			r.group.position.set(p.x, p.y, p.z);
			r.group.rotation.order = "YXZ";
			r.group.rotation.set(p.pitch, p.yaw, 0);
			this.scene.add(r.group);
			this.lot.set(i, r.group);
		}
	}
	hideLotStall(idx) {
		for (const [i, g] of this.lot) g.visible = i !== idx;
	}
	setCallsign(name) {
		paintNameplate(this.roadster.nameplate, name);
	}
	superspeedTo(x, y, z) {
		this.guide = new Vector3(x, y, z);
		this.playing = true;
	}
	setRemote(id, name, s) {
		let slot = this.remotes.get(id);
		if (!slot) {
			const r = makeRoadster();
			r.group.traverse((o) => {
				if (o instanceof Mesh && o.material instanceof MeshPhongMaterial) {
					if (o.material.color.getHex() === 11805464) o.material.color.setHex(2781115);
				}
			});
			paintNameplate(r.nameplate, name);
			this.scene.add(r.group);
			slot = {
				mesh: r.group,
				pos: new Vector3(),
				yaw: 0,
				pitch: 0,
				roll: 0,
				plate: r.nameplate
			};
			this.remotes.set(id, slot);
		} else paintNameplate(slot.plate, name);
		slot.pos.set(s.x, s.y, s.z);
		slot.yaw = s.yaw;
		slot.pitch = s.pitch;
		slot.roll = s.roll;
	}
	pruneRemotes(live) {
		for (const [id, slot] of this.remotes) {
			if (live.has(id)) continue;
			this.scene.remove(slot.mesh);
			const mat = slot.plate.userData.plateMat;
			mat?.map?.dispose();
			mat?.dispose();
			this.remotes.delete(id);
		}
	}
	setPlaying(v) {
		this.playing = v;
		if (v) {
			this.timer.update();
			this.timer.getDelta();
		}
	}
	setDetail(t) {
		this.detail = t;
		const q = qualityFromDetail(t);
		const voxelChanged = Math.abs(q.voxelSize - this.quality.voxelSize) > .15;
		const radiusChanged = q.radius !== this.quality.radius;
		this.quality = q;
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, t > .4 ? 1.5 : 1));
		this.renderer.shadowMap.enabled = q.shadows;
		this.lights.sun.castShadow = q.shadows;
		if (voxelChanged) {
			this.world = new World(this.seed, q.voxelSize);
			this.clearChunks();
			this.primeChunks();
		} else if (radiusChanged) this.markStream();
	}
	newWorld() {
		this.seed = this.seed + 2654435769 >>> 0;
		this.world = new World(this.seed, this.quality.voxelSize);
		this.clearChunks();
		this.placeSpawn();
		this.vel.set(0, 0, 0);
		this.primeChunks();
	}
	start() {
		this.resize();
		requestAnimationFrame(() => this.resize());
		const loop = () => {
			if (this.disposed) return;
			this.raf = requestAnimationFrame(loop);
			this.tick();
		};
		this.timer.reset();
		this.raf = requestAnimationFrame(loop);
	}
	dispose() {
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		this.unbind?.();
		window.removeEventListener("resize", this.resize);
		this.clearChunks();
		this.renderer.dispose();
		this.solidMat.dispose();
		this.waterMat.dispose();
		this.fallTex.dispose();
		this.ripples.dispose();
		this.planet.tex.dispose();
		this.planet.mesh.geometry.dispose();
		this.timer.dispose();
		if (window.__controlsTest) delete window.__controlsTest;
	}
	resize = () => {
		const parent = this.renderer.domElement.parentElement;
		const w = parent?.clientWidth || window.innerWidth;
		const h = parent?.clientHeight || window.innerHeight;
		this.camera.aspect = w / Math.max(1, h);
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h, false);
	};
	placeSpawn() {
		const p = poseForSpawn(this.spawnIdx);
		this.pos.set(p.x, p.y, p.z);
		this.yaw = p.yaw;
		this.pitch = p.pitch;
		this.followDist = 18;
		this.hideLotStall(this.spawnIdx);
	}
	primeChunks() {
		this.markStream();
		const n = Math.min(12, this.queue.length);
		for (let i = 0; i < n; i++) this.buildNext();
		this.rebuildInstances();
	}
	chunkKey(cx, cz) {
		return `${cx},${cz}`;
	}
	markStream() {
		const span = 16 * this.world.voxelSize;
		const pcx = Math.floor(this.pos.x / span);
		const pcz = Math.floor(this.pos.z / span);
		const r = this.quality.radius;
		const needed = /* @__PURE__ */ new Set();
		this.queue.length = 0;
		for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
			if (dx * dx + dz * dz > r * r + 1) continue;
			const cx = pcx + dx;
			const cz = pcz + dz;
			const k = this.chunkKey(cx, cz);
			needed.add(k);
			if (!this.chunks.has(k)) this.queue.push({
				cx,
				cz,
				d: dx * dx + dz * dz
			});
		}
		this.queue.sort((a, b) => a.d - b.d);
		for (const [k, ch] of this.chunks) if (!needed.has(k)) this.unload(k, ch);
		const fogFar = Math.max(900, r * span * 3.2);
		const fog = this.scene.fog;
		if (fog instanceof Fog) fog.far = Math.max(2200, fogFar * 2);
		this.camera.far = Math.max(4200, 3400);
		this.camera.updateProjectionMatrix();
	}
	unload(k, ch) {
		if (ch.solid) {
			this.scene.remove(ch.solid);
			ch.solid.geometry.dispose();
		}
		if (ch.water) {
			this.scene.remove(ch.water);
			ch.water.geometry.dispose();
		}
		this.chunks.delete(k);
		const gk = `g:${k}`;
		const g = this.giants.get(gk);
		if (g) {
			this.scene.remove(g);
			g.traverse((o) => {
				if (o instanceof Mesh) o.geometry.dispose();
			});
			this.giants.delete(gk);
		}
		const f = this.falls.get(k);
		if (f) {
			this.scene.remove(f);
			f.geometry.dispose();
			this.falls.delete(k);
		}
		this.instancesDirty = true;
	}
	clearChunks() {
		for (const [k, ch] of [...this.chunks]) this.unload(k, ch);
		this.queue.length = 0;
	}
	buildNext() {
		const job = this.queue.shift();
		if (!job) return;
		const k = this.chunkKey(job.cx, job.cz);
		if (this.chunks.has(k)) return;
		const built = meshChunk(this.world, job.cx, job.cz, this.quality);
		const loaded = {
			cx: job.cx,
			cz: job.cz,
			solid: null,
			water: null,
			placements: built.placements
		};
		if (built.solid) {
			const mesh = new Mesh(built.solid, this.solidMat);
			mesh.castShadow = this.quality.shadows;
			mesh.receiveShadow = true;
			this.scene.add(mesh);
			loaded.solid = mesh;
		}
		if (built.water) {
			const mesh = new Mesh(built.water, this.waterMat);
			this.scene.add(mesh);
			loaded.water = mesh;
		}
		this.chunks.set(k, loaded);
		for (const p of built.placements) {
			if (p.kind === "giant") {
				const gk = `g:${k}`;
				if (!this.giants.has(gk)) {
					const tree = makeGiantTree(xmur3(`${this.seed}:${p.x}:${p.z}`), p.scale);
					tree.position.set(p.x, p.y, p.z);
					tree.rotation.y = p.rot;
					this.scene.add(tree);
					this.giants.set(gk, tree);
				}
			}
			if (p.kind === "fall") {
				const h = Math.max(12, p.extra ?? 20);
				const geo = new PlaneGeometry(3.2, h);
				const mat = new MeshBasicMaterial({
					map: this.fallTex,
					transparent: true,
					depthWrite: false,
					side: 2
				});
				const mesh = new Mesh(geo, mat);
				mesh.position.set(p.x, p.y - h * .45, p.z);
				mesh.rotation.y = p.rot + Math.PI / 2;
				this.scene.add(mesh);
				this.falls.set(k, mesh);
			}
		}
		this.instancesDirty = true;
	}
	rebuildInstances() {
		let ti = 0;
		let fi = 0;
		let ci = 0;
		const dummy = this.dummy;
		for (const ch of this.chunks.values()) for (const p of ch.placements) if (p.kind === "tree" && ti < 1400) {
			dummy.position.set(p.x, p.y, p.z);
			dummy.rotation.set(0, p.rot, 0);
			dummy.scale.setScalar(p.scale);
			dummy.updateMatrix();
			this.treeTrunk.setMatrixAt(ti, dummy.matrix);
			this.treeCanopy.setMatrixAt(ti, dummy.matrix);
			ti++;
		} else if (p.kind === "fern" && fi < 900) {
			dummy.position.set(p.x, p.y, p.z);
			dummy.rotation.set(0, p.rot, .1);
			dummy.scale.setScalar(p.scale);
			dummy.updateMatrix();
			this.ferns.setMatrixAt(fi, dummy.matrix);
			fi++;
		} else if (p.kind === "crystal" && ci < 500) {
			dummy.position.set(p.x, p.y, p.z);
			dummy.rotation.set(.3, p.rot, .2);
			dummy.scale.setScalar(p.scale);
			dummy.updateMatrix();
			this.crystals.setMatrixAt(ci, dummy.matrix);
			ci++;
		}
		this.treeTrunk.count = ti;
		this.treeCanopy.count = ti;
		this.ferns.count = fi;
		this.crystals.count = ci;
		this.treeTrunk.instanceMatrix.needsUpdate = true;
		this.treeCanopy.instanceMatrix.needsUpdate = true;
		this.ferns.instanceMatrix.needsUpdate = true;
		this.crystals.instanceMatrix.needsUpdate = true;
		this.instancesDirty = false;
	}
	tick() {
		const t0 = performance.now();
		this.timer.update();
		const dt = Math.min(this.timer.getDelta(), .1);
		this.input.tick(dt);
		if (this.playing) this.integrate(dt);
		this.markStream();
		this.buildNext();
		if (this.queue.length > 8) this.buildNext();
		if (this.instancesDirty) this.rebuildInstances();
		this.updateCraftCamera(dt);
		this.updateSpores(this.timer.getElapsed());
		this.sky.mesh.position.copy(this.pos);
		this.ripples.pulse(this.craft, this.localWish, this.roadster.nozzles, dt);
		this.ripples.update(dt);
		this.updateRemotes(dt);
		this.renderer.render(this.scene, this.camera);
		this.frameCount += 1;
		this.workMs += performance.now() - t0;
		this.statsT += dt;
		if (this.statsT >= this.hudPeriod) {
			this.fpsOut = this.frameCount / this.statsT;
			this.cpuOut = Math.min(100, this.workMs / (this.statsT * 1e3) * 100);
			this.hudPeriod = this.cpuOut > 1 ? 2 : 1;
			this.frameCount = 0;
			this.workMs = 0;
			this.statsT = 0;
		}
		this.hudAcc += dt;
		if (this.hudAcc > .12) {
			this.hudAcc = 0;
			const cruise = this.cruiseLabel();
			this.onHud({
				altitude: this.pos.y,
				speed: this.vel.length(),
				heading: MathUtils.radToDeg(this.yaw),
				zoom: this.followDist,
				seed: this.seed,
				chunksLoaded: this.chunks.size,
				chunksQueued: this.queue.length,
				braking: this.brakingT > 0,
				cruiseLabel: cruise,
				generating: this.queue.length > 0,
				fps: this.fpsOut,
				cpuPct: this.cpuOut,
				sights: [
					STARBASE_POI,
					{
						id: "crystal-arch",
						kind: "sight",
						name: "Crystal Arch",
						x: 210,
						y: 88,
						z: -40
					},
					{
						id: "gulf-deep",
						kind: "sight",
						name: "Gulf Deep",
						x: -40,
						y: 12,
						z: 240
					}
				]
			});
		}
	}
	cruiseLabel() {
		const f = this.input.axes.fwd.cruise;
		if (this.brakingT > 0) return "coasting";
		if (f === 2) return "fast cruise";
		if (f === 1 || this.input.axes.fwd.held) return "cruise";
		if (this.vel.length() > 1.2) return "gliding";
		return "still";
	}
	integrate(dt) {
		if (this.input.stopLatched) {
			this.input.stopAll();
			this.brakingT = BRAKE_SEC;
		}
		if (this.input.zoomIn) this.followDist = Math.max(6, this.followDist - 22 * dt);
		if (this.input.zoomOut) this.followDist = Math.min(90, this.followDist + 28 * dt);
		_euler.set(this.pitch, this.yaw, this.roll, "YXZ");
		_quat.setFromEuler(_euler);
		_fwd.set(0, 0, -1).applyQuaternion(_quat);
		_right.set(1, 0, 0).applyQuaternion(_quat);
		_up.set(0, 1, 0).applyQuaternion(_quat);
		let wishYaw = 0;
		let wishPitch = 0;
		let wishRoll = 0;
		const yl = this.input.sample("yawL", dt);
		const yr = this.input.sample("yawR", dt);
		const pu = this.input.sample("pitchUp", dt);
		const pd = this.input.sample("pitchDn", dt);
		const rl = this.input.sample("rollL", dt);
		const rr = this.input.sample("rollR", dt);
		if (yl === -1) this.yaw += NUDGE_ANG;
		else wishYaw += rateFromSample(yl, 0, CRUISE_ANG, FAST_ANG);
		if (yr === -1) this.yaw -= NUDGE_ANG;
		else wishYaw -= rateFromSample(yr, 0, CRUISE_ANG, FAST_ANG);
		wishYaw += this.input.steerInject * CRUISE_ANG;
		wishYaw += this.touch.lookX * CRUISE_ANG;
		if (pu === -1) this.pitch += NUDGE_ANG * .7;
		else wishPitch += rateFromSample(pu, 0, CRUISE_ANG * .75, FAST_ANG * .75);
		if (pd === -1) this.pitch -= NUDGE_ANG * .7;
		else wishPitch -= rateFromSample(pd, 0, CRUISE_ANG * .75, FAST_ANG * .75);
		wishPitch -= this.touch.lookY * CRUISE_ANG * .75;
		wishRoll += rateFromSample(rl, 0, 1.1, 1.8);
		wishRoll -= rateFromSample(rr, 0, 1.1, 1.8);
		if (rl === -1) this.roll += .22;
		if (rr === -1) this.roll -= .22;
		if (this.brakingT > 0) {
			const k = 1 - Math.exp(-Math.log(40) * dt / this.brakingT);
			this.yawRate += (0 - this.yawRate) * k;
			this.pitchRate += (0 - this.pitchRate) * k;
			this.rollRate += (0 - this.rollRate) * k;
		} else {
			if (wishYaw !== 0 || wishPitch !== 0) {
				this.yawRate = wishYaw;
				this.pitchRate = wishPitch;
			} else {
				this.yawRate *= Math.exp(-dt * 5);
				this.pitchRate *= Math.exp(-dt * 5);
			}
			this.rollRate = wishRoll;
		}
		this.yaw += this.yawRate * dt;
		this.pitch += this.pitchRate * dt;
		this.pitch = MathUtils.clamp(this.pitch, -1.25, 1.25);
		const bank = MathUtils.clamp(this.yawRate * .32 + this.rollRate * .5, -.7, .7);
		this.roll = MathUtils.damp(this.roll, bank, 6, dt);
		_wish.set(0, 0, 0);
		const apply = (s, dir, cruise, fast) => {
			if (s === -1) this.vel.addScaledVector(dir, 18);
			else if (s === 1) _wish.addScaledVector(dir, cruise);
			else if (s === 2) _wish.addScaledVector(dir, fast);
		};
		apply(this.input.sample("fwd", dt), _fwd, 26, 62);
		apply(this.input.sample("back", dt), _fwd, -18.2, -43.4);
		apply(this.input.sample("left", dt), _right, -18.2, -34.1);
		apply(this.input.sample("right", dt), _right, 18.2, 34.1);
		apply(this.input.sample("up", dt), _up, 18.2, 34.1);
		apply(this.input.sample("down", dt), _up, -18.2, -34.1);
		if (this.touch.fwd > .1) _wish.addScaledVector(_fwd, 26 * this.touch.fwd);
		if (this.touch.back > .1) _wish.addScaledVector(_fwd, -18.2 * this.touch.back);
		_wish.addScaledVector(_right, this.touch.x * 26 * .7);
		_wish.addScaledVector(_up, this.touch.y * 26 * .7);
		if (this.guide) {
			_tmp.copy(this.guide).sub(this.pos);
			const dist = _tmp.length();
			if (dist < 14) this.guide = null;
			else {
				_tmp.multiplyScalar(1 / dist);
				_wish.copy(_tmp).multiplyScalar(190);
				this.yaw = Math.atan2(-_tmp.x, -_tmp.z);
				this.pitch = Math.asin(MathUtils.clamp(_tmp.y, -.95, .95));
			}
		}
		this.localWish.set(_wish.dot(_right), _wish.dot(_up), -_wish.dot(_fwd));
		if (this.brakingT > 0) {
			this.brakingT = Math.max(0, this.brakingT - dt);
			const k = Math.exp(-Math.log(50) * dt / Math.max(this.brakingT, .05));
			this.vel.multiplyScalar(this.brakingT <= 0 ? 0 : k);
			if (this.brakingT <= 0) this.vel.set(0, 0, 0);
		} else if (_wish.lengthSq() > .01) this.vel.lerp(_wish, 1 - Math.exp(-dt * 2.4));
		else this.vel.multiplyScalar(Math.exp(-dt * .12));
		this.pos.addScaledVector(this.vel, dt);
		const floor = minClearanceY(this.pos.x, this.pos.z);
		if (this.pos.y < floor) {
			this.pos.y = floor;
			if (this.vel.y < 0) this.vel.y = 0;
		}
		if (this.pos.y > 760) {
			this.pos.y = 760;
			if (this.vel.y > 0) this.vel.y = 0;
		}
		if (!this.guide) this.separateFromCars();
	}
	separateFromCars() {
		for (const slot of this.remotes.values()) {
			_tmp.copy(this.pos).sub(slot.pos);
			const len = _tmp.length();
			if (len > .001 && len < 5.8) {
				_tmp.multiplyScalar(1 / len);
				this.pos.addScaledVector(_tmp, CAR_SEP - len);
				const closing = this.vel.dot(_tmp);
				if (closing < 0) this.vel.addScaledVector(_tmp, -closing);
			}
		}
		const floor = minClearanceY(this.pos.x, this.pos.z);
		if (this.pos.y < floor) this.pos.y = floor;
	}
	updateCraftCamera(dt) {
		_euler.set(this.pitch, this.yaw, this.roll, "YXZ");
		this.craft.rotation.copy(_euler);
		this.craft.position.copy(this.pos);
		_euler.set(this.pitch * .28, this.yaw, 0, "YXZ");
		_fwd.set(0, 0, -1).applyEuler(_euler);
		_tmp.copy(this.pos).addScaledVector(_fwd, -this.followDist);
		_tmp.y += this.followDist * .32 + 2.2;
		this.camera.position.lerp(_tmp, 1 - Math.exp(-dt * 7));
		_look.copy(this.pos).addScaledVector(_fwd, 2.5);
		_look.y += .55;
		this.camera.lookAt(_look);
		const speed = this.vel.length();
		const targetFov = 58 + Math.min(16, speed * .18) - (22 - Math.min(22, this.followDist)) * .35;
		this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 4, dt);
		this.camera.updateProjectionMatrix();
	}
	updateSpores(t) {
		if (!this.quality.spores) {
			this.spores.count = 0;
			return;
		}
		this.spores.count = 180;
		for (let i = 0; i < 180; i++) {
			const ox = this.sporeOffsets[i * 3];
			const oy = this.sporeOffsets[i * 3 + 1];
			const oz = this.sporeOffsets[i * 3 + 2];
			const x = this.pos.x + ox + Math.sin(t * .3 + i) * 6;
			const y = this.pos.y + oy + Math.cos(t * .21 + i * .4) * 4;
			const z = this.pos.z + oz + Math.cos(t * .27 + i) * 6;
			this.dummy.position.set(x, y, z);
			this.dummy.scale.setScalar(.6 + i % 5 * .15);
			this.dummy.rotation.set(0, 0, 0);
			this.dummy.updateMatrix();
			this.spores.setMatrixAt(i, this.dummy.matrix);
		}
		this.spores.instanceMatrix.needsUpdate = true;
	}
	updateRemotes(dt) {
		for (const slot of this.remotes.values()) {
			slot.mesh.position.lerp(slot.pos, 1 - Math.exp(-dt * 8));
			slot.mesh.rotation.order = "YXZ";
			slot.mesh.rotation.y = slot.yaw;
			slot.mesh.rotation.x = slot.pitch;
			slot.mesh.rotation.z = slot.roll;
		}
	}
	installProbe() {
		window.__controlsTest = {
			getYaw: () => this.yaw,
			getSpeed: () => this.vel.length(),
			getPose: () => ({
				x: this.pos.x,
				y: this.pos.y,
				z: this.pos.z,
				yaw: this.yaw,
				pitch: this.pitch
			}),
			getCallsign: () => String(this.roadster.nameplate.userData.label ?? ""),
			applySpawn: (idx) => this.applySpawn(idx),
			setCallsign: (name) => this.setCallsign(name),
			setSteer: (v) => this.input.setSteer(v),
			setKeys: (codes) => this.input.setKeys(codes)
		};
	}
};
//#endregion
export { Engine };
