// This file is mostly written by ChatGPT 5.2

// Renders 3D polylines (arrays of Vec3 points) onto a 2D canvas using a perspective frustum.
// - ctx: CanvasRenderingContext2D
// - polylines: Array<Array<{x:number,y:number,z:number}>>
// - camera: {
//		eye:{x,y,z}, target:{x,y,z}, up:{x,y,z},
//		fovY:number (radians), aspect:number, near:number, far:number
//	}
// - viewport: { x:number, y:number, w:number, h:number }  // canvas rect in pixels

function renderFrustumPolylines(ctx, polylines, camera, viewport)
{
	const V = mat4LookAt(camera.eye, camera.target, camera.up);
	const P = mat4Perspective(camera.fovY, camera.aspect, camera.near, camera.far);
	const VP = mat4Mul(P, V);

	ctx.beginPath();

	for (const poly of polylines)
	{
		if (!poly || poly.length < 2) continue;

		for (let i = 0; i < poly.length - 1; i++)
		{
			const a = poly[i];
			const b = poly[i + 1];

			const ca = mat4MulVec4(VP, [a.x, a.y, a.z, 1]);
			const cb = mat4MulVec4(VP, [b.x, b.y, b.z, 1]);

			const clipped = clipLineClipSpace(ca, cb);
			if (!clipped) continue;

			const [p0, p1] = clipped;

			// Perspective divide -> NDC
			const ndc0 = [p0[0] / p0[3], p0[1] / p0[3], p0[2] / p0[3]];
			const ndc1 = [p1[0] / p1[3], p1[1] / p1[3], p1[2] / p1[3]];

			// NDC [-1..1] -> screen pixels
			const s0 = ndcToScreen(ndc0, viewport);
			const s1 = ndcToScreen(ndc1, viewport);

			ctx.moveTo(s0[0], s0[1]);
			ctx.lineTo(s1[0], s1[1]);
		}
	}

	ctx.stroke();
}

function ndcToScreen(ndc, vp)
{
	// Canvas y-axis points down; NDC y-axis points up.
	const x = vp.x + (ndc[0] * 0.5 + 0.5) * vp.w;
	const y = vp.y + (1 - (ndc[1] * 0.5 + 0.5)) * vp.h;
	return [x, y];
}

// --- Homogeneous line clipping in clip space ---
// Clip space constraints (OpenGL-style):
//	-w <= x <= w
//	-w <= y <= w
//	-w <= z <= w
//
// Returns null if fully outside, else returns [p0,p1] (both vec4 in clip space).
function clipLineClipSpace(p0, p1)
{
	let t0 = 0, t1 = 1;
	const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2], p1[3] - p0[3]];

	// For each plane: (a·p + b >= 0). In homogeneous clip space:
	//	x + w >= 0, -x + w >= 0, y + w >= 0, -y + w >= 0, z + w >= 0, -z + w >= 0.
	const planes = [
		[ 1,  0,  0,  1],	// x + w >= 0
		[-1,  0,  0,  1],	// -x + w >= 0
		[ 0,  1,  0,  1],	// y + w >= 0
		[ 0, -1,  0,  1],	// -y + w >= 0
		[ 0,  0,  1,  1],	// z + w >= 0
		[ 0,  0, -1,  1]	// -z + w >= 0
	];

	for (const pl of planes)
	{
		const f0 = pl[0]*p0[0] + pl[1]*p0[1] + pl[2]*p0[2] + pl[3]*p0[3];
		const f1 = pl[0]*p1[0] + pl[1]*p1[1] + pl[2]*p1[2] + pl[3]*p1[3];
		const df = f1 - f0;

		if (df === 0)
		{
			if (f0 < 0) return null; // parallel and outside
			continue;
		}

		const t = -f0 / df;

		if (df > 0)
		{
			// entering
			if (t > t0) t0 = t;
		}
		else
		{
			// leaving
			if (t < t1) t1 = t;
		}

		if (t0 > t1) return null;
	}

	const q0 = [
		p0[0] + d[0]*t0, p0[1] + d[1]*t0, p0[2] + d[2]*t0, p0[3] + d[3]*t0
	];
	const q1 = [
		p0[0] + d[0]*t1, p0[1] + d[1]*t1, p0[2] + d[2]*t1, p0[3] + d[3]*t1
	];

	// Also reject if w is non-positive after clipping (avoid invalid perspective divide)
	if (q0[3] <= 0 && q1[3] <= 0) return null;

	return [q0, q1];
}

// --- Minimal 4x4 matrix helpers (column-major, WebGL-style) ---

function mat4Mul(A, B)
{
	// C = A * B
	const C = new Float32Array(16);
	for (let c = 0; c < 4; c++)
	{
		for (let r = 0; r < 4; r++)
		{
			C[c*4 + r] =
				A[0*4 + r] * B[c*4 + 0] +
				A[1*4 + r] * B[c*4 + 1] +
				A[2*4 + r] * B[c*4 + 2] +
				A[3*4 + r] * B[c*4 + 3];
		}
	}
	return C;
}

function mat4MulVec4(M, v)
{
	return [
		M[0]*v[0] + M[4]*v[1] + M[8]*v[2] + M[12]*v[3],
		M[1]*v[0] + M[5]*v[1] + M[9]*v[2] + M[13]*v[3],
		M[2]*v[0] + M[6]*v[1] + M[10]*v[2] + M[14]*v[3],
		M[3]*v[0] + M[7]*v[1] + M[11]*v[2] + M[15]*v[3]
	];
}

function mat4Perspective(fovY, aspect, near, far)
{
	const f = 1 / Math.tan(fovY * 0.5);
	const nf = 1 / (near - far);

	const M = new Float32Array(16);
	M[0] = f / aspect;	M[4] = 0;	M[8]  = 0;					M[12] = 0;
	M[1] = 0;			M[5] = f;	M[9]  = 0;					M[13] = 0;
	M[2] = 0;			M[6] = 0;	M[10] = (far + near) * nf;	M[14] = (2 * far * near) * nf;
	M[3] = 0;			M[7] = 0;	M[11] = -1;					M[15] = 0;
	return M;
}

function mat4LookAt(eye, target, up)
{
	const z = normalize3(sub3(eye, target));	// forward (camera looks down -Z in view space)
	const x = normalize3(cross3(up, z));		// right
	const y = cross3(z, x);					// true up

	const M = new Float32Array(16);
	M[0] = x.x;	M[4] = x.y;	M[8]  = x.z;	M[12] = -dot3(x, eye);
	M[1] = y.x;	M[5] = y.y;	M[9]  = y.z;	M[13] = -dot3(y, eye);
	M[2] = z.x;	M[6] = z.y;	M[10] = z.z;	M[14] = -dot3(z, eye);
	M[3] = 0;	M[7] = 0;	M[11] = 0;		M[15] = 1;
	return M;
}

// --- Vec3 helpers ---
function scale3(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s}; }
function sub3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function dot3(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
function cross3(a, b)
{
	return {
		x: a.y*b.z - a.z*b.y,
		y: a.z*b.x - a.x*b.z,
		z: a.x*b.y - a.y*b.x
	};
}
function normalize3(v)
{
	const len = Math.hypot(v.x, v.y, v.z) || 1;
	return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function rotateVecY(v, angle)
{
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	return {
		x:  v.x * c - v.z * s,
		y:  v.y,
		z:  v.x * s + v.z * c
	};
}


class Plane {
	constructor(position, normal) {
		Object.assign(this, { position, normal: normalize3(normal)} );
	}

	intersect_with(other) {

		const n1 = this.normal;
		const n2 = other.normal;

		// Direction of intersection line
		const dir = cross3(n1, n2);
		const dirLen2 = dot3(dir, dir);

		// Parallel (or nearly)
		if (dirLen2 < 1e-8)
			return null;

		// Plane constants: n·x + d = 0
		const d1 = -dot3(n1, this.position);
		const d2 = -dot3(n2, other.position);

		// Compute point on line
		// x = ( (d2*n1 - d1*n2) × dir ) / |dir|²
		const tmp = sub3(
			scale3(n1, d2),
			scale3(n2, d1)
		);

		const point = scale3(
			cross3(tmp, dir),
			1 / dirLen2
		);

		return {
			point,      // point on the line
			direction: normalize3(dir)
		};
	};


}
function create_convex_hull() {

	const ph1 = performance.now()*0.007 % (Math.PI * 2);
	const ph2 = performance.now()*0.005 % (Math.PI * 2);
	const sides = [
		// Top
		new Plane({x:0, y:-2, z:0}, {x:0, y:-1, z:0}),

		new Plane({x:-2, y:0, z:0}, {x:-3, y:1, z:0}),
		new Plane({x: 2, y:0, z:0}, {x: 3, y:1, z:0}),
		new Plane({x:0, y:0, z:-2}, {x:0, y:1, z:-3}),
		new Plane({x:0, y:0, z: 2}, {x:0, y:1, z: 3}),

		// Bottom
		new Plane({x:0, y:2, z:0}, {x:Math.sin(ph1)*.2, y:1, z:Math.sin(ph2)*.2}),
	];

	const hull = [];
	const EPS = 1e-6;

	for (let i = 0; i < sides.length - 1; i++) {
		for (let j = i + 1; j < sides.length; j++) {

			const line = sides[i].intersect_with(sides[j]);
			if (!line) continue;

			let tMin = -Infinity;
			let tMax = +Infinity;

			for (let k = 0; k < sides.length; k++) {
				if (k === i || k === j) continue;

				const pl = sides[k];

				// inside: dot(n, x - p0) <= 0
				const a = dot3(pl.normal, line.direction);
				const c = dot3(pl.normal, sub3(line.point, pl.position));

				// Parallel to plane
				if (Math.abs(a) < EPS) {
					if (c > 0) { // entirely outside
						tMin = 1;
						tMax = 0;
						break;
					}
					continue;
				}

				const tHit = -c / a;

				if (a > 0) {
					// t <= tHit
					if (tHit < tMax) tMax = tHit;
				} else {
					// t >= tHit
					if (tHit > tMin) tMin = tHit;
				}

				if (tMin > tMax) break;
			}

			if (tMin <= tMax) {
				const p0 = {
					x: line.point.x + line.direction.x * tMin,
					y: line.point.y + line.direction.y * tMin,
					z: line.point.z + line.direction.z * tMin
				};
				const p1 = {
					x: line.point.x + line.direction.x * tMax,
					y: line.point.y + line.direction.y * tMax,
					z: line.point.z + line.direction.z * tMax
				};

				hull.push([p0, p1]);
			}
		}
	}

	return hull;
}



function demo_convex_hull() {

	const hull = create_convex_hull();
	const eye = rotateVecY({x:0,y:2,z:10}, performance.now()*0.001 % (Math.PI * 2));
	C.clearRect(0, 0, W, H);

	renderFrustumPolylines(
		C,
		hull,
		{
			eye,
			target:{x:0,y:0,z:0},
			up:{x:0,y:1,z:0},
			fovY:Math.PI/4,
			aspect:canvas.width/canvas.height,
			near:0.1,
			far:100
		},
		{ x:0, y:0, w:canvas.width, h:canvas.height }
	);

	window.requestAnimationFrame(demo_convex_hull);
}

window.requestAnimationFrame(demo_convex_hull);