let f = Math.floor(Math.random() * 360),
	transitionAudioData = [];

function load() {
	document.body.classList.add('loaded');
	//frameRate(60);
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
