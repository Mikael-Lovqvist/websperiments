{ // Wrapping in new local scope so we can override constants
const oldCanvas = document.getElementById('canvas');
const canvas = oldCanvas.cloneNode(true);
oldCanvas.parentNode.replaceChild(canvas, oldCanvas);
const C = canvas.getContext('2d');


//Create useful variables
function setup() {
	const [W, H] = [400, 400];
    const aspect = W / H;
    const scale = aspect >= 1 ? H / 2 : W / 2;
	canvas.width = W;
	canvas.height = H;

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
	C.scale(scale, scale);

	// Set 1 pixel wide lines
	C.lineWidth = 1 / scale;
}


setup();



const { Bitfield_Image_Sampler } = await import('../lib/image-functions.js');
//Load
const sampler = Bitfield_Image_Sampler.from_string('16,16,AAAAAAAAAAAAAA4AEQDx/xGgDqAAAAAAAAAAAAAAAAA=');

const s = 0.08;
for (let y = -10; y < 10; y++) {
    const xo = y & 1 ? -0.5*s : 0;
    const sxo = (y >> 1);
    //const sxo = y & 1 ? 1 : 0;
	for (let x = -10; x < 10; x++) {
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

		if (sampler.sample(sxo + x + 8, 8 + y)) {
			C.fillStyle = `#cf8`;
		} else {
			C.fillStyle = `#f88`;
		}

		C.fill();

		// Triangle lines
		C.strokeStyle = '#000';

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

canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
	const viewX = e.clientX - rect.left;
	const viewY = e.clientY - rect.top;

	// Get the current transform matrix
	const m = C.getTransform(); // DOMMatrix
	const inv = m.invertSelf();  // In-place inverse

	const worldX = inv.a * viewX + inv.c * viewY + inv.e;
	const worldY = inv.b * viewX + inv.d * viewY + inv.f;

	// Store or use the world coords
	console.log('World:', worldX, worldY);
});

}