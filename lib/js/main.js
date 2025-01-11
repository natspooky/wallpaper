/*window.wallpaperPropertyListener = {
	applyUserProperties: function (properties) {
		if (properties.schemecolor) {
			var schemeColor = properties.schemecolor.value.split(' ');
			schemeColor = schemeColor.map(function (c) {
				return Math.ceil(c * 255);
			});
			document.body.style.backgroundColor = `rgb(${schemeColor})`;
		}

		if (properties.customimage) {
			var customimage = properties.customimage.value;

			if (customimage != '') {
				customimage = customimage.replace('%3A', ':');
				document.body.style.backgroundImage = `url(${customimage})`;
			} else {
				document.body.style.backgroundImage = '';
			}
		}
	},
};*/

let f = Math.floor(Math.random() * 360);

function load() {
	document.body.classList.add('loaded');
	frameRate(60);
}

async function frameRate(t) {
	let then = performance.now(),
		interval = 1000 / t,
		delta = 0;
	while (true) {
		let now = await new Promise(requestAnimationFrame);
		if (now - then < interval - delta) {
			continue;
		}
		delta = Math.min(interval, delta + now - then - interval);
		then = now;
		//console.log(0.2 - 0.2 / interval);

		canvasGradient(t);
	}
}

function canvasGradient(t) {
	if (f >= 360) {
		f = 0;
	}

	document
		.querySelector('.background-container ')
		.style.setProperty('--angle-offset', `${f}deg`);

	f += 0.2;
}

window.wallpaperPropertyListener = {
	applyUserProperties: function (properties) {
		if (properties.yourproperty) {
			// Do something with yourproperty
		}
		if (properties.anotherproperty) {
			// Do something with anotherproperty
		}
		// Add more properties here
	},
};

window.addEventListener('load', load);
