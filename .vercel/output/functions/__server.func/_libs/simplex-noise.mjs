//#region node_modules/simplex-noise/dist/esm/simplex-noise.js
var SQRT3 = /*#__PURE__*/ Math.sqrt(3);
var SQRT5 = /*#__PURE__*/ Math.sqrt(5);
var F2 = .5 * (SQRT3 - 1);
var G2 = (3 - SQRT3) / 6;
var F3 = 1 / 3;
var G3 = 1 / 6;
(SQRT5 - 1) / 4;
(5 - SQRT5) / 20;
var fastFloor = (x) => Math.floor(x) | 0;
var grad2 = /*#__PURE__*/ new Float64Array([
	1,
	1,
	-1,
	1,
	1,
	-1,
	-1,
	-1,
	1,
	0,
	-1,
	0,
	1,
	0,
	-1,
	0,
	0,
	1,
	0,
	-1,
	0,
	1,
	0,
	-1
]);
var grad3 = /*#__PURE__*/ new Float64Array([
	1,
	1,
	0,
	-1,
	1,
	0,
	1,
	-1,
	0,
	-1,
	-1,
	0,
	1,
	0,
	1,
	-1,
	0,
	1,
	1,
	0,
	-1,
	-1,
	0,
	-1,
	0,
	1,
	1,
	0,
	-1,
	1,
	0,
	1,
	-1,
	0,
	-1,
	-1
]);
/**
* Creates a 2D noise function
* @param random the random function that will be used to build the permutation table
* @returns {NoiseFunction2D}
*/
function createNoise2D(random = Math.random) {
	const perm = buildPermutationTable(random);
	const permGrad2x = new Float64Array(perm).map((v) => grad2[v % 12 * 2]);
	const permGrad2y = new Float64Array(perm).map((v) => grad2[v % 12 * 2 + 1]);
	return function noise2D(x, y) {
		let n0 = 0;
		let n1 = 0;
		let n2 = 0;
		const s = (x + y) * F2;
		const i = fastFloor(x + s);
		const j = fastFloor(y + s);
		const t = (i + j) * G2;
		const X0 = i - t;
		const Y0 = j - t;
		const x0 = x - X0;
		const y0 = y - Y0;
		let i1, j1;
		if (x0 > y0) {
			i1 = 1;
			j1 = 0;
		} else {
			i1 = 0;
			j1 = 1;
		}
		const x1 = x0 - i1 + G2;
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1 + 2 * G2;
		const y2 = y0 - 1 + 2 * G2;
		const ii = i & 255;
		const jj = j & 255;
		let t0 = .5 - x0 * x0 - y0 * y0;
		if (t0 >= 0) {
			const gi0 = ii + perm[jj];
			const g0x = permGrad2x[gi0];
			const g0y = permGrad2y[gi0];
			t0 *= t0;
			n0 = t0 * t0 * (g0x * x0 + g0y * y0);
		}
		let t1 = .5 - x1 * x1 - y1 * y1;
		if (t1 >= 0) {
			const gi1 = ii + i1 + perm[jj + j1];
			const g1x = permGrad2x[gi1];
			const g1y = permGrad2y[gi1];
			t1 *= t1;
			n1 = t1 * t1 * (g1x * x1 + g1y * y1);
		}
		let t2 = .5 - x2 * x2 - y2 * y2;
		if (t2 >= 0) {
			const gi2 = ii + 1 + perm[jj + 1];
			const g2x = permGrad2x[gi2];
			const g2y = permGrad2y[gi2];
			t2 *= t2;
			n2 = t2 * t2 * (g2x * x2 + g2y * y2);
		}
		return 70 * (n0 + n1 + n2);
	};
}
/**
* Creates a 3D noise function
* @param random the random function that will be used to build the permutation table
* @returns {NoiseFunction3D}
*/
function createNoise3D(random = Math.random) {
	const perm = buildPermutationTable(random);
	const permGrad3x = new Float64Array(perm).map((v) => grad3[v % 12 * 3]);
	const permGrad3y = new Float64Array(perm).map((v) => grad3[v % 12 * 3 + 1]);
	const permGrad3z = new Float64Array(perm).map((v) => grad3[v % 12 * 3 + 2]);
	return function noise3D(x, y, z) {
		let n0, n1, n2, n3;
		const s = (x + y + z) * F3;
		const i = fastFloor(x + s);
		const j = fastFloor(y + s);
		const k = fastFloor(z + s);
		const t = (i + j + k) * G3;
		const X0 = i - t;
		const Y0 = j - t;
		const Z0 = k - t;
		const x0 = x - X0;
		const y0 = y - Y0;
		const z0 = z - Z0;
		let i1, j1, k1;
		let i2, j2, k2;
		if (x0 >= y0) {
			if (y0 >= z0) {
				i1 = 1;
				j1 = 0;
				k1 = 0;
				i2 = 1;
				j2 = 1;
				k2 = 0;
			} else if (x0 >= z0) {
				i1 = 1;
				j1 = 0;
				k1 = 0;
				i2 = 1;
				j2 = 0;
				k2 = 1;
			} else {
				i1 = 0;
				j1 = 0;
				k1 = 1;
				i2 = 1;
				j2 = 0;
				k2 = 1;
			}
		} else if (y0 < z0) {
			i1 = 0;
			j1 = 0;
			k1 = 1;
			i2 = 0;
			j2 = 1;
			k2 = 1;
		} else if (x0 < z0) {
			i1 = 0;
			j1 = 1;
			k1 = 0;
			i2 = 0;
			j2 = 1;
			k2 = 1;
		} else {
			i1 = 0;
			j1 = 1;
			k1 = 0;
			i2 = 1;
			j2 = 1;
			k2 = 0;
		}
		const x1 = x0 - i1 + G3;
		const y1 = y0 - j1 + G3;
		const z1 = z0 - k1 + G3;
		const x2 = x0 - i2 + 2 * G3;
		const y2 = y0 - j2 + 2 * G3;
		const z2 = z0 - k2 + 2 * G3;
		const x3 = x0 - 1 + 3 * G3;
		const y3 = y0 - 1 + 3 * G3;
		const z3 = z0 - 1 + 3 * G3;
		const ii = i & 255;
		const jj = j & 255;
		const kk = k & 255;
		let t0 = .6 - x0 * x0 - y0 * y0 - z0 * z0;
		if (t0 < 0) n0 = 0;
		else {
			const gi0 = ii + perm[jj + perm[kk]];
			t0 *= t0;
			n0 = t0 * t0 * (permGrad3x[gi0] * x0 + permGrad3y[gi0] * y0 + permGrad3z[gi0] * z0);
		}
		let t1 = .6 - x1 * x1 - y1 * y1 - z1 * z1;
		if (t1 < 0) n1 = 0;
		else {
			const gi1 = ii + i1 + perm[jj + j1 + perm[kk + k1]];
			t1 *= t1;
			n1 = t1 * t1 * (permGrad3x[gi1] * x1 + permGrad3y[gi1] * y1 + permGrad3z[gi1] * z1);
		}
		let t2 = .6 - x2 * x2 - y2 * y2 - z2 * z2;
		if (t2 < 0) n2 = 0;
		else {
			const gi2 = ii + i2 + perm[jj + j2 + perm[kk + k2]];
			t2 *= t2;
			n2 = t2 * t2 * (permGrad3x[gi2] * x2 + permGrad3y[gi2] * y2 + permGrad3z[gi2] * z2);
		}
		let t3 = .6 - x3 * x3 - y3 * y3 - z3 * z3;
		if (t3 < 0) n3 = 0;
		else {
			const gi3 = ii + 1 + perm[jj + 1 + perm[kk + 1]];
			t3 *= t3;
			n3 = t3 * t3 * (permGrad3x[gi3] * x3 + permGrad3y[gi3] * y3 + permGrad3z[gi3] * z3);
		}
		return 32 * (n0 + n1 + n2 + n3);
	};
}
/**
* Builds a random permutation table.
* This is exported only for (internal) testing purposes.
* Do not rely on this export.
* @private
*/
function buildPermutationTable(random) {
	const tableSize = 512;
	const p = new Uint8Array(tableSize);
	for (let i = 0; i < tableSize / 2; i++) p[i] = i;
	for (let i = 0; i < tableSize / 2 - 1; i++) {
		const r = i + ~~(random() * (256 - i));
		const aux = p[i];
		p[i] = p[r];
		p[r] = aux;
	}
	for (let i = 256; i < tableSize; i++) p[i] = p[i - 256];
	return p;
}
//#endregion
export { createNoise3D as n, createNoise2D as t };
