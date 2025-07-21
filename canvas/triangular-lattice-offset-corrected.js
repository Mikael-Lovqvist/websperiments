//Create useful variables
const aspect = W / H;
const scale = aspect >= 1 ? H / 2 : W / 2;

function setup() {
	// Reset transform
	C.setTransform(1, 0, 0, 1, 0, 0);

	// Clear canvas
	C.clearRect(0, 0, W, H);

	// Reset common properties
	C.globalCompositeOperation = 'source-over';
	C.fillStyle = 'rgba(255,200,100,1)';
	C.strokeStyle = 'rgba(0,0,0,1)';


	// Set up transform to map -1,-1..1,1 to canvas with aspect fit
	const offsetX = W / 2;
	const offsetY = H / 2;

	//Apply transform
	C.translate(offsetX, offsetY);
	C.scale(scale, -scale);

	// Set 1 pixel wide lines
	C.lineWidth = 1 / scale;
}


setup();

function hash(x, y, low, high) {
	const seed = x * 374761393 ^ y * 668265263; // Large primes
	let h = seed ^ (seed >> 3) ^ (seed >> 13) ^ (seed << 2);
	h = (h * 1274126177) & 0xffffffff;
	return (h >>> 0) % (high - low) + low;
}


const s = 0.2;
for (let y = -3; y < 3; y++) {
    const xo = y & 1 ? s * .5 : 0;
	for (let x = -3; x < 3; x++) {
		const p0 = [xo + (x + .5) * s, y * s];
		const p1 = [xo + (x + 1.5) * s, y * s];
		const p2 = [xo + (x + 1) * s, (y + 1) * s];
		const p3 = [xo + (x + 0) * s, (y + 1) * s];

		// Filled parallelogram
		C.beginPath();
		C.moveTo(...p0);
		C.lineTo(...p1);
		C.lineTo(...p2);
		C.lineTo(...p3);
		C.closePath();
        const hue = hash(x, y, 0, 360);
        const sat = hash(x, y, 20, 80);
        const light = hash(x, y, 60, 90);
		C.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
		C.fill();

		// Triangle lines
		C.strokeStyle = 'black';
		C.lineWidth = 1 / scale;

		// Outline parallelogram
		C.beginPath();
		C.moveTo(...p0);
		C.lineTo(...p1);
		C.lineTo(...p2);
		C.lineTo(...p3);
		C.closePath();
		C.stroke();

		// Diagonal from p0 to p2
		C.beginPath();
		C.moveTo(...p0);
		C.lineTo(...p2);
		C.stroke();
	}
}
