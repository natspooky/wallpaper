class Particles {
	constructor(canvas, settings) {
		this.canvas = canvas;
		this.connect = settings.connectParticles;
		this.particles = settings.particles ? settings.particles : 20;
		this.particleList = [];
		for (let i = 0; i < this.particles; i++) {
			this.particleList.push(
				new Particle(
					{
						x: this.ran(0, this.canvas.width),
						y: this.ran(0, this.canvas.height),
					},
					{ x: this.ran(0, 1), y: this.ran(0, 1) },
					{ x: this.ran(0, 1), y: this.ran(0, 1) },
					this.ran(0.5, 1),
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
}

class canvas {
	constructor(canvas, settings) {
		//settings: {fps, size:{x,y}, autoResize, useCursor, autoClear}

		this.staticRes = settings.size;
		this.resize = settings.autoResize;
		this.autoClear = settings.autoClear;
		this.fps = settings.fps;
		this.useCursor = settings.useCursor;

		this.canvas = canvas;

		this.ctx = this.canvas.getContext('2d');

		this.canvasPos = this.#position();
		this.canvasSize = this.#size();

		this.cursor = {
			pos: { x: 0, y: 0 },
			events: {
				pressed: false,
				hover: false,
			},
		};

		this.drawing = false;

		this.#calculateSize();
		this.#setEvents();
	}

	scaleCanvas(x, y) {
		this.ctx.scale(x, y);
	}

	translateCanvas(x, y) {
		this.ctx.translate(x, y);
	}

	test(data) {
		console.log(data);
	}

	#calculateSize() {
		if (this.staticRes) {
			this.canvas.width = this.staticRes.x;
			this.canvas.height = this.staticRes.y;
		} else {
			this.canvas.width = this.canvasSize.x;
			this.canvas.height = this.canvasSize.y;
		}
	}

	draw(func, customVar) {
		this.currentDrawFunc = func; // should allow for the code to be reset without asking for the input again
		if (this.drawing) {
			this.drawing = false;
			this.#frameRate(func, customVar);
		} else {
			this.#frameRate(func, customVar);
		}
	}

	addStaticSize(size) {
		this.staticRes = size;
		this.#calculateSize();
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
					function: this,
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

	#position() {
		const box = this.canvas.getBoundingClientRect();

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

	#size() {
		return {
			x: this.canvas.offsetWidth,
			y: this.canvas.offsetHeight,
		};
	}

	#setEvents() {
		this.resObserver = new ResizeObserver(() => {
			this.#resize();
			if (this.resize) {
				this.#calculateSize();
			}
		});
		this.resObserver.observe(this.canvas);

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
			x: this.staticRes
				? event.pageX * (this.staticRes.x / this.canvas.offsetWidth) -
				  this.canvasPos.left
				: event.pageX - this.canvasPos.left,
			y: this.staticRes
				? event.pageY * (this.staticRes.y / this.canvas.offsetHeight) -
				  this.canvasPos.top
				: event.pageY - this.canvasPos.top,
		};
	}

	#mouseDown() {
		this.cursor.events.pressed = true;
	}

	#mouseUp() {
		this.cursor.events.pressed = false;
	}

	#mouseEnter() {
		this.cursor.events.hover = true;
	}

	#mouseLeave() {
		this.cursor.events.hover = false;
	}

	//add intersection observer to save recources offscreen

	#resize() {
		this.canvasPos = this.#position();
		this.canvasSize = this.#size();
	}

	remove() {
		this.drawing = false;
		this.resObserver.unobserve(this.canvas);
		this.canvas.remove();
	}
}

class functionManager {
	checkVal(value) {
		if (value == undefined || value == null) return false;
		return true;
	}

	fallback(value, fallback, type) {
		switch (type) {
			case 'tf':
				break;
			case 'un':
				break;
		}
	}
}

/*

let width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

*/
