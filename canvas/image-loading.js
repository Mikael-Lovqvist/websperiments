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


const { load_image_from_src, Image_Data_Sampler, Bitfield_Image_Sampler } = await import('../lib/image-functions.js');

/*
//Convert
const sampler = new Image_Data_Sampler(await load_image_from_src("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAFVJREFUOE9jZGBg+A/EZAMmsnVCNQ4DA1hAXvn/HxGOjIyMJAULC0gzsiZ0PiHTwC5AB8guQpdD52M1gJA3YK4E0SwgxZSEASjERlMieryQyKc4MwEA45UXJyonWOMAAAAASUVORK5CYII="));
console.log(sampler.encode_as_bitfield());
*/

//Load
const sampler = Bitfield_Image_Sampler.from_string('16,16,AAAAAAAAAAAAAA4AEQDx/xGgDqAAAAAAAAAAAAAAAAA=');
sampler.pixel_map((x, y, value) => {
	C.beginPath();
	C.arc(x * 0.1 - sampler.width * .05, sampler.height * .05 - y * 0.1, value ? 0.05 : 0.02, 0, Math.PI * 2);
	C.fill();
});
