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

function drawShapeSetOperation(op) {
	// Define shapes in normalized space
	const shape1 = new Path2D();
	const shape2 = new Path2D();

	// Shape 1: Circle centered left
	shape1.arc(-0.3, 0, 0.5, 0, Math.PI * 2);

	// Shape 2: Circle centered right
	shape2.arc(0.3, 0, 0.5, 0, Math.PI * 2);

	// Fill shapes with set operation
	C.fillStyle = 'rgb(0, 128, 255)';
	C.fill(shape1);

	C.globalCompositeOperation = op; // e.g., 'source-in', 'xor', etc.
	C.fillStyle = 'rgb(255, 0, 128)';
	C.fill(shape2);

	C.globalCompositeOperation = 'source-over';

	// Scale lineWidth based on transform scale
	C.lineWidth = 2 / scale;
	C.strokeStyle = 'black';
	C.stroke(shape1);
	C.stroke(shape2);

}

setup();
drawShapeSetOperation('xor');