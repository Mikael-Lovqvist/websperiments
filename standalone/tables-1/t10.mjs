// Here we are going to try to present something

class Style_Definitions {
	constructor(definitions) {
		Object.assign(this, { definitions });
	}
}

class Capture {
	constructor(target, associative_array) {
		Object.assign(this, { target, associative_array });
	}
}

function C(target, associative_array) {
	return new Capture(target, associative_array);
}

function S(style_definitions) {
	return new Style_Definitions(style_definitions);
}

function T(contents) {

	//For now - assume plain text
	return document.createTextNode(contents);

}

function E(tagName, ...members) {

	const e = document.createElement(tagName);
	for (const m of members) {
		//For now we assume some sort of node but could be different stuff later
		if (m instanceof Capture) {
			for (const [name, sub_member] of Object.entries(m.associative_array)) {
				m.target[name] = sub_member;
				e.appendChild(sub_member);
			}
		} else if (m instanceof Style_Definitions) {
			Object.assign(e.style, m.definitions);
		} else {

			switch (m.nodeType) {
				case Node.ELEMENT_NODE:
				case Node.TEXT_NODE:
					e.appendChild(m);
					break;

				default:
					throw new Error(`Unrecognized member: ${m}`);
			}
		}
	}
	return e;

}



export async function test_table() {

	const data = await (await fetch('./t10.json')).json();
	const headings = ['Planet', 'Atmosphere', 'Temperature', 'Population', 'Notes'];

	const table = E('table',
		E('thead',
			E('tr', ...headings.map(h => E('th', T(h)))),
		),
		E('tbody',
			...data.map(e => E('tr',
				E('th', T(e.planet)),
				E('td', T(e.atmosphere)),
				E('td', T(`${e.temperature.value.toLocaleString()} ${e.temperature.unit}`)),
				E('td', T(e.population.toLocaleString())),
				E('td', E('ol', ...e.notes.map(n => E('li', T(n))))),
			)),
		),
	);

	document.body.appendChild(table);

	const lut = {};
	const info = E('div',
		S({
			color: '#FF0',
		}),

		E('span',
			S({
				fontWeight: 'bold',
				minWidth: '8em',
				display: 'inline-block',
				textAlign: 'right',
				paddingRight: '.5em',
			}),
			C(lut, {cell: T('Cell')}),
		),
		T('·'),
		E('span',
			S({
				fontStyle: 'italic',
				paddingLeft: '.5em',
				color: '#C80',
			}),
			C(lut, {text: T('???')}),
		),
	);

	document.body.appendChild(info);

	table.addEventListener('mousemove', (e) => {
		const section = e.target.closest('tbody') ||e.target.closest('thead');
		const cell = e.target.closest('td') ||e.target.closest('th');
		const row = e.target.closest('tr');
		lut.text.data = cell?.innerHTML || '???';
		lut.cell.data = `${section.tagName} ${row.sectionRowIndex}:${cell.cellIndex}`;

	})


}
