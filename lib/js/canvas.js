class Particles {
	constructor(settings) {
		this.particles = settings.particles ? settings.particles : 20;
		this.particleList = [];
		for (let i = 0; i < this.particles; i++) {
			this.particleList.push(
				new Particle(
					{ x: this.ran(0, canvas.width), y: 0 },
					{ x: this.ran(0, 1), y: this.ran(0, 1) },
					{ x: this.ran(0, 1), y: this.ran(0, 1) },
					this.ran(0, 2),
					'#ffffff',
				),
			);
		}
	}

	ran(lowB, upB) {
		if (!lowB) lowB = 0;
		if (!upB) upB = 1;
		return Math.max(lowB, Math.random() * upB);
	}

	particles() {
		return this.particleList;
	}
}

class Particle {
	constructor(pos, vel, acc, ran, col) {
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

	step() {
		//motion of particle
	}

	pos() {
		return this.position;
	}
}

//

class canvas {
	constructor(canvas, settings) {
		//settings: {fps, resolution:{x,y}, autoResize, useCursor, autoClear, resScale: {active: true, defaultRes:{x,y}}}
		this.resize = settings.autoResize;
		this.autoClear = settings.autoClear;
		this.staticRes = settings.resolution;
		this.fps = settings.fps;
		this.useCursor = settings.useCursor; // assume on
		this.canvas = canvas;
		this.canvas.width = canvas.offetWidth;
		this.canvas.height = canvas.offsetHeight;
		this.canvasPos = this.#position(canvas);
		this.cursor = {
			pos: { x: 0, y: 0 },
			events: {
				pressed: false,
				in: false,
			},
		};
		this.ctx = this.canvas.getContext('2d');
		this.drawing = false;
		this.#setEvents();
	}

	scale(x, y) {
		this.ctx.scale(x, y);
	}

	translate(x, y) {
		this.ctx.translate(x, y);
	}

	draw(func, customVar) {
		if (this.drawing) {
			this.drawing = false;
			this.#frameRate(func, customVar);
		} else {
			this.#frameRate(func, customVar);
		}
	}

	async #frameRate(func, customVar) {
		this.drawing = true;
		let then = performance.now(),
			interval = 1000 / this.fps,
			delta = 0,
			seconds = 0,
			FPSbuffer = 0,
			fps = this.fps,
			frameDelta = 0;
		while (this.drawing) {
			let now = await new Promise(requestAnimationFrame);
			if (now - then < interval - delta) {
				continue;
			}

			frameDelta = (now - then) / 1000;

			if (seconds <= 1) {
				seconds += frameDelta;
				FPSbuffer++;
			} else {
				fps = FPSbuffer;
				seconds = 0;
				FPSbuffer = 0;
			}

			delta = Math.min(interval, delta + now - then - interval);
			then = now;

			if (this.autoClear) {
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			}

			func(
				{
					canvas: this.canvas,
					ctx: this.ctx,
					fps: {
						current: fps,
						target: this.fps,
						delta: frameDelta,
						animationMult: 1 / fps,
					},
					cursor: this.cursor,
				},
				customVar,
			);
		}
	}

	#position(canvas) {
		const box = canvas.getBoundingClientRect();

		const body = document.body;
		const docEl = document.documentElement;

		const scrollTop =
			window.pageYOffset || docEl.scrollTop || body.scrollTop;
		const scrollLeft =
			window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

		const clientTop = docEl.clientTop || body.clientTop || 0;
		const clientLeft = docEl.clientLeft || body.clientLeft || 0;

		const top = box.top + scrollTop - clientTop;
		const left = box.left + scrollLeft - clientLeft;

		return { top: Math.round(top), left: Math.round(left) };
	}

	//events

	#setEvents() {
		if (this.resize) {
			this.resObserver = new ResizeObserver(() => {
				this.#resize();
			});
			this.resObserver.observe(this.canvas);
		}
		if (this.useCursor) {
			document.addEventListener(
				'mousemove',
				this.#mouseMove.bind(this),
				false,
			);

			this.canvas.addEventListener(
				'mousedown',
				this.#mouseDown.bind(this),
				false,
			);
			this.canvas.addEventListener(
				'mouseup',
				this.#mouseUp.bind(this),
				false,
			);
			this.canvas.addEventListener(
				'mouseleave',
				this.#mouseLeave.bind(this),
				false,
			);
			this.canvas.addEventListener(
				'mouseenter',
				this.#mouseEnter.bind(this),
				false,
			);
		}
	}

	#mouseMove(event) {
		this.cursor.pos = {
			x: event.pageX - this.canvasPos.left,
			y: event.pageY - this.canvasPos.top,
		};
	}

	#mouseDown() {
		this.cursor.events.pressed = true;
	}
	#mouseUp() {
		this.cursor.events.pressed = false;
	}
	#mouseEnter() {
		this.cursor.events.in = true;
	}
	#mouseLeave() {
		this.cursor.events.in = false;
	}

	//add intersection observer to save recources offscreen

	#resize() {
		this.canvasPos = this.#position(this.canvas);

		if (!this.staticRes) {
			this.canvas.height = this.canvas.offsetHeight;
			this.canvas.width = this.canvas.offsetWidth;
		}
	}

	remove() {
		this.drawing = false;
		this.resObserver.unobserve(this.canvas);
		this.canvas.remove();
	}
}

/*

let width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

*/
