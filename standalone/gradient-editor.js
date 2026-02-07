const exportShaderBtn = document.getElementById('exportShader');
const exportJSONBtn   = document.getElementById('exportJSON');

const exportDialog = document.getElementById('exportDialog');
const exportText   = document.getElementById('exportText');

exportText.addEventListener('wheel', (e) => {
	const atTop    = exportText.scrollTop === 0;
	const atBottom =
		exportText.scrollTop + exportText.clientHeight >= exportText.scrollHeight;

	if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
		e.preventDefault();
	}
}, { passive: false });


const gradientCanvas = document.getElementById('gradientCanvas');
const gctx = gradientCanvas.getContext('2d', { willReadFrequently: true });
const pickerCanvas = document.getElementById('picker');
const pctx = pickerCanvas.getContext('2d', { willReadFrequently: true });
const addBtn = document.getElementById('addPoint');
const removeBtn = document.getElementById('removePoint');
const tbody = document.querySelector('#pointsTable tbody');

// Helpers
const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const toHex2 = (n)=>n.toString(16).padStart(2,'0');
function rgbToHex(r,g,b){ return '#' + toHex2(r) + toHex2(g) + toHex2(b); }
function hexToRgb(hex){
	if(!hex) return null;
	hex = hex.trim();
	const m3 = /^#?([0-9a-fA-F]{3})$/;
	const m6 = /^#?([0-9a-fA-F]{6})$/;
	let m;
	if(m = hex.match(m3)){
		const s=m[1];
		const r=parseInt(s[0]+s[0],16), g=parseInt(s[1]+s[1],16), b=parseInt(s[2]+s[2],16);
		return {r,g,b};
	}
	if(m = hex.match(m6)){
		const s=m[1];
		const r=parseInt(s.slice(0,2),16), g=parseInt(s.slice(2,4),16), b=parseInt(s.slice(4,6),16);
		return {r,g,b};
	}
	return null;
}

const pointsTable = document.getElementById('pointsTable');

pointsTable.addEventListener('wheel', (e) => {
	const { target } = e;

	if (target.type === 'number') {

		e.preventDefault();

		const dir = Math.sign(e.deltaY);
		if (dir === 0) return;

		const step = e.shiftKey ? 0.10 : 0.01;

		const weight = parseFloat(target.value);
		target.value = Math.max(0.01, +(weight - dir * step).toFixed(4));
		target.dispatchEvent(new Event('input', { bubbles: true }));

	} else {
		return;
	}

}, { passive: false });


function drawPicker(){
	const w=pickerCanvas.width, h=pickerCanvas.height;
	const hue = pctx.createLinearGradient(0,0,w,0);
	hue.addColorStop(0/6,'#f00');
	hue.addColorStop(1/6,'#ff0');
	hue.addColorStop(2/6,'#0f0');
	hue.addColorStop(3/6,'#0ff');
	hue.addColorStop(4/6,'#00f');
	hue.addColorStop(5/6,'#f0f');
	hue.addColorStop(1,'#f00');
	pctx.fillStyle=hue; pctx.fillRect(0,0,w,h);
	const whiteGrad=pctx.createLinearGradient(0,0,0,h);
	whiteGrad.addColorStop(0,'rgba(255,255,255,1)');
	whiteGrad.addColorStop(0.5,'rgba(255,255,255,0)');
	pctx.fillStyle=whiteGrad; pctx.fillRect(0,0,w,h);
	const blackGrad=pctx.createLinearGradient(0,0,0,h);
	blackGrad.addColorStop(0.5,'rgba(0,0,0,0)');
	blackGrad.addColorStop(1,'rgba(0,0,0,1)');
	pctx.fillStyle=blackGrad; pctx.fillRect(0,0,w,h);
}

// Model: list of control points, each { hex, weight }
let points = [
	{ hex:'#008',    weight:0.75 }, // was #00F, now #008
	{ hex:'#8000ff', weight:0.75 },
	{ hex:'#ff0080', weight:1.00 },
	{ hex:'#ff8000', weight:0.75 },
	{ hex:'#ffffff', weight:1.00 },
];

// Selection state
let selected = 0;

function segmentWeights(pts){
	const n=pts.length; const seg=[];
	for(let i=0;i<n-1;i++) seg.push((pts[i].weight + pts[i+1].weight)/2);
	return seg;
}

function positionsFromWeights(pts){
	const seg = segmentWeights(pts);
	const sum = seg.reduce((a,b)=>a+b,0) || 1;
	const len = seg.map(s=>s/sum);
	const t=[0];
	for(let i=0;i<len.length;i++) t.push(t[t.length-1]+len[i]);
	t[t.length-1]=1; // exact endpoint
	return t; // size == pts.length
}

function drawGradient(){
	const w = gradientCanvas.width, h = gradientCanvas.height;
	const t = positionsFromWeights(points);

	const img = gctx.createImageData(w,1);
	const data = img.data;

	// Precompute RGB from hex
	const rgb = points.map(p=>hexToRgb(p.hex) || {r:0,g:0,b:0});

	let si = 0; // segment index
	for(let x=0;x<w;x++){
		const u = x/(w-1);
		// advance segment
		while(si < t.length-2 && u > t[si+1]) si++;
		const a = t[si], b = t[si+1];
		const v = b>a ? (u - a)/(b - a) : 0;
		const r = Math.round(lerp(rgb[si].r, rgb[si+1].r, v));
		const g = Math.round(lerp(rgb[si].g, rgb[si+1].g, v));
		const bch = Math.round(lerp(rgb[si].b, rgb[si+1].b, v));
		const k = x*4;
		data[k+0]=r; data[k+1]=g; data[k+2]=bch; data[k+3]=255;
	}
	// scale to full height
	gctx.putImageData(img,0,0);
	gctx.imageSmoothingEnabled=false;
	gctx.drawImage(gradientCanvas,0,0,w,h);
}

function setSelected(i){
	if (selected === i) return;
	const rows = [...tbody.querySelectorAll('tr')];
	if (rows[selected]) rows[selected].classList.remove('sel');
	selected = i;
	if (rows[selected]) rows[selected].classList.add('sel');
}

function refreshPositions(){
	const t = positionsFromWeights(points);
	const rows = tbody.querySelectorAll('tr');
	for (let j = 0; j < rows.length; j++) {
		const posCell = rows[j].lastElementChild; // position column
		if (posCell) posCell.textContent = t[j].toFixed(6);
	}
	drawGradient();
}

// Update swatches (and non-focused hex inputs) to match current point colors,
// then redraw the gradient. Does not rebuild the table or steal focus.
function refreshColors(){
	const rows = tbody.querySelectorAll('tr');
	for (let j = 0; j < points.length; j++) {
		const row = rows[j];
		if (!row) continue;

		const swatch = row.querySelector('.swatch');
		if (swatch) swatch.style.background = points[j].hex;

		const hexInput = row.querySelector('input[type="text"]');
		if (hexInput && document.activeElement !== hexInput) {
			hexInput.value = points[j].hex;  // keep focused input untouched
		}
	}
	drawGradient();
}


function updateTable(){
	tbody.innerHTML='';
	const t = positionsFromWeights(points);
	points.forEach((p,i)=>{
		const tr=document.createElement('tr');
		if(i===selected) tr.classList.add('sel');

		const tdIdx=document.createElement('td'); tdIdx.textContent=i+1; tr.appendChild(tdIdx);

		const tdSw=document.createElement('td');
		const sw=document.createElement('span'); sw.className='swatch'; sw.style.background=p.hex; tdSw.appendChild(sw); tr.appendChild(tdSw);

		const tdHex=document.createElement('td');
		const inpHex=document.createElement('input'); inpHex.type='text'; inpHex.value=p.hex; inpHex.placeholder='#rrggbb';


		/* Possible refactor:
		inpHex.addEventListener('change', () => {
			const rgb = hexToRgb(inpHex.value);
			if (rgb) {
				p.hex = normalizeHex(inpHex.value);
				drawGradient();
				// remove updateTable() here
			} else {
				inpHex.value = p.hex;
			}
		});
		*/


		tdHex.appendChild(inpHex); tr.appendChild(tdHex);

		const tdW=document.createElement('td');
		const inpW=document.createElement('input'); inpW.type='number'; inpW.min='0.01'; inpW.step='0.01'; inpW.value=p.weight.toString();

		tdW.appendChild(inpW); tr.appendChild(tdW);

		const tdPos=document.createElement('td');
		tdPos.textContent = t[i].toFixed(6);
		tr.appendChild(tdPos);

		tr.addEventListener('click', (e) => {
			setSelected(i);
		});


		inpHex.addEventListener('focus', () => setSelected(i));

		inpHex.addEventListener('change',()=>{
			const rgb=hexToRgb(inpHex.value);
			if(rgb){ p.hex = normalizeHex(inpHex.value); refreshColors(); }
			else { inpHex.value=p.hex; }
		});

		inpHex.addEventListener('input',()=>{
			const rgb=hexToRgb(inpHex.value);
			if(rgb){ p.hex = normalizeHex(inpHex.value); refreshColors(); }

		});

		inpW.addEventListener('focus',  () => setSelected(i));
		inpW.addEventListener('input',()=>{ p.weight = Math.max(0.01, parseFloat(inpW.value)||1); refreshPositions(); });
		inpW.addEventListener('change',()=>{ p.weight = Math.max(0.01, parseFloat(inpW.value)||1); refreshPositions(); });



		tbody.appendChild(tr);
	});
	removeBtn.disabled = points.length<=2 || selected==null;
}

function normalizeHex(h){
	h=h.trim(); if(h[0]!=='#') h='#'+h; // allow missing '#'
	const rgb=hexToRgb(h); if(!rgb) return '#000000';
	return rgbToHex(rgb.r,rgb.g,rgb.b);
}

function updateSelection(){ updateTable(); drawGradient(); }

function addPointAfter(idx){
	const t = positionsFromWeights(points);
	const left = Math.max(0, Math.min(idx, points.length-1));
	const right = Math.min(left+1, points.length-1);
	const u = (t[left] + t[right]) / 2;
	const col = sampleGradient(u);
	points.splice(left+1,0,{ hex: col, weight: 1.0 });
	selected = left+1; updateSelection();
}

function sampleGradient(u){
	const t = positionsFromWeights(points);
	const rgb = points.map(p => hexToRgb(p.hex));
	let i = 0;
	while (i < t.length - 2 && u > t[i+1]) i++;
	const a = t[i], b = t[i+1];
	const v = b > a ? (u - a) / (b - a) : 0;
	const rr = Math.round(lerp(rgb[i].r, rgb[i+1].r, v));
	const gg = Math.round(lerp(rgb[i].g, rgb[i+1].g, v));
	const bb = Math.round(lerp(rgb[i].b, rgb[i+1].b, v));
	return rgbToHex(rr, gg, bb);
}

addBtn.addEventListener('click',()=>{
	const idx = selected ?? (points.length-2);
	addPointAfter(idx);
});

removeBtn.addEventListener('click',()=>{
	if(points.length<=2 || selected==null) return;
	points.splice(selected,1);
	selected = Math.max(0, Math.min(selected, points.length-1));
	updateSelection();
});

pickerCanvas.addEventListener('click', (e)=>{
	if(selected==null) return;
	const rect = pickerCanvas.getBoundingClientRect();
	const x = Math.floor((e.clientX - rect.left) * (pickerCanvas.width/rect.width));
	const y = Math.floor((e.clientY - rect.top) * (pickerCanvas.height/rect.height));
	const px = pctx.getImageData(x,y,1,1).data;
	const hex = rgbToHex(px[0],px[1],px[2]);
	points[selected].hex = hex; updateSelection();
});

// Initial render
drawPicker();
drawGradient();
updateTable();


function buildShaderFunction() {
	const t = positionsFromWeights(points);
	const rgb = points.map(p => hexToRgb(p.hex));

	let out = [];
	out.push("float3 gradient(float t)");
	out.push("{");
	out.push("\tt = saturate(t);");

	for (let i = 0; i < points.length - 1; i++) {
		const a = t[i].toFixed(6);
		const b = t[i+1].toFixed(6);
		const c0 = rgb[i];
		const c1 = rgb[i+1];

		// FIX: last segment must be unconditional
		out.push(
			i === 0
				? `\tif (t < ${b})`
				: (i === points.length - 2
					? `\telse`
					: `\telse if (t < ${b})`)
		);

		out.push("\t\treturn lerp(");
		out.push(`\t\t\tfloat3(${(c0.r/255).toFixed(6)}, ${(c0.g/255).toFixed(6)}, ${(c0.b/255).toFixed(6)}),`);
		out.push(`\t\t\tfloat3(${(c1.r/255).toFixed(6)}, ${(c1.g/255).toFixed(6)}, ${(c1.b/255).toFixed(6)}),`);
		out.push(`\t\t\t(t - ${a}) / (${b} - ${a})`);
		out.push("\t\t);");
	}

	out.push("}");
	return out.join("\n");
}


function showExportDialog({ title, text, filename, mime }) {
	const dlg   = document.getElementById('exportDialog');
	const ta    = document.getElementById('exportText');
	const h     = document.getElementById('exportTitle');
	const copy  = document.getElementById('copyExport');
	const dl    = document.getElementById('downloadExport');

	h.textContent = title;
	ta.value = text;

	copy.onclick = async () => {
		await navigator.clipboard.writeText(text);
	};

	dl.onclick = () => {
		downloadText(filename, text, mime);
	};

	dlg.showModal();
}

function downloadText(filename, text, mime = "text/plain") {
	const blob = new Blob([text], { type: mime });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	a.click();
	URL.revokeObjectURL(a.href);
}


function buildJSON() {
	return JSON.stringify(
		{ points: points.map(p => ({ hex: p.hex, weight: p.weight })) },
		null,
		2
	);
}


exportShaderBtn.addEventListener('click', () => {
	showExportDialog({
		title: "OBS shader: gradient()",
		text: buildShaderFunction(),
		filename: "gradient.hlsl",
		mime: "text/plain"
	});
});

exportJSONBtn.addEventListener('click', () => {
	showExportDialog({
		title: "Gradient JSON",
		text: buildJSON(),
		filename: "gradient.json",
		mime: "application/json"
	});
});
