export function load_image_from_src(src) {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.src = src;

		image.addEventListener('load', ({ target }) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			canvas.width = target.width;
			canvas.height = target.height;

			ctx.drawImage(target, 0, 0);

			resolve(ctx.getImageData(0, 0, target.width, target.height));
		});
	});
}

export class Image_Row_Reference {
	constructor(sampler, row) {
		Object.assign(this, { sampler, row });
	}

	*[Symbol.iterator]() {
		yield* this.sampler.iter_row(this.row);
	}
}

export class RGBA_unorm8 {
	constructor(R=0, G=0, B=0, A=255) {
		Object.assign(this, { R, G, B, A });
	}

	*[Symbol.iterator]() {
		const {R, G, B, A} = this;
		yield* [R, G, B, A];
	}

	get non_zero() {
		const {R, G, B, A} = this;
		return (A > 0) && ((R > 0) || (G > 0) || (B > 0));
	}

}

export class Image_Data_Sampler {
	constructor(image_data) {
		Object.assign(this, { image_data });
	}

	encode_as_bitfield() {
		//TODO - add alignment option
		const { width, height } = this.image_data;
		let result = '';
		const bytes_per_row = Math.ceil(width / 8);

		for (const row of this) {
			let pending_value = 0;
			let bit_value = 1;
			for (const pixel of row) {

				if (pixel.non_zero) {
					pending_value |= bit_value;
				}

				bit_value <<= 1;
				if (bit_value === 256) {
					result += String.fromCharCode(pending_value);
					pending_value = 0;
					bit_value = 1;
				}
			}
			if (bit_value > 1) { //If we have a tail we flush it here.
				result += String.fromCharCode(pending_value);
				pending_value = 0;
				bit_value = 1;
			}
		}
		return `${width},${height},${btoa(result)}`;
	}

	*iter_row(row) {
		const { pixelFormat, data, width, height } = this.image_data;
		switch(pixelFormat) {
			case 'rgba-unorm8': {
				const pixel_offset_y = row * width;
				for (let x=0; x<width; x++) {
					const pixel_offset_x = pixel_offset_y + x;
					const data_offset = pixel_offset_x * 4;
					yield new RGBA_unorm8(...data.slice(data_offset, data_offset + 4));
				}
				break;
			}

			default:
				throw new Error(`Format ${pixelFormat} is not yet supported by ${this.constructor.name}.`);
		}
	}

	*[Symbol.iterator]() {
		const { pixelFormat, data, width, height } = this.image_data;
		switch(pixelFormat) {
			case 'rgba-unorm8': {
				for (let y=0; y<height; y++) {
					yield new Image_Row_Reference(this, y);
				}
				break;
			}

			default:
				throw new Error(`Format ${pixelFormat} is not yet supported by ${this.constructor.name}.`);
		}
	}

}