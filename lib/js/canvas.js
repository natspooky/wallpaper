class particles {
	constructor(settings) {
		if (settings.particles) {
			this.particles = settings.particles ? settings.particles : 20;
		}
	}

	init() {
		this.canvas.width = e;
	}

	draw(interval) {}

	async frameRate(t, func) {
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

			func(interval);
		}
	}

	windowResize() {}
}

class particle {
	constructor(pos, col, vel, acc, ran) {
		this.position = pos;
		this.color = col;
		this.velocity = vel;
		this.acceleration = acc;
		this.random = ran;
	}

	acceleration(interval) {
		return deltaV / interval;
	}

	distance(pos) {}

	velocity() {}

	move() {
		this.position = {
			x: this.position.x,
		};
	}
}
