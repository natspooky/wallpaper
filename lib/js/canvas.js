class Particles {
	constructor(canvas, settings) {
		this.canvas = canvas;

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
		//if (!lowB) lowB = 0;

		//if (!upB) upB = 1;
		return Math.max(lowB, Math.random() * upB);
	}

	step() {
		this.particleList.forEach((particle, index) => {
			particle.step();
		});
	}

	pythag(a) {
		return Math.sqrt(a.x ** 2 + a.y ** 2);
	}

	draw(ctx, ac) {
		this.particleList.forEach((particle) => {
			particle.draw(ctx, ac);
		});
		for (let i = 0; i < this.particleList.length; i++) {
			for (let j = i + 1; j < this.particleList.length; j++) {
				if (
					Math.abs(
						this.pythag(this.particleList[i].pos()) -
							this.pythag(this.particleList[j].pos()),
					) < 10
				) {
					let a = this.particleList[i].pos(),
						b = this.particleList[j].pos();
					ctx.strokeStyle = `rgba(255,255,255,0.5)`;
					ctx.lineWidth = 10;
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}
		}
	}
}

class Particle {
	constructor(pos, vel, acc, ran, col) {
		this.position = pos;
		this.color = col;
		this.vel = vel;
		this.acceleration = acc;
		this.random = ran;
	}

	acceleration(interval) {
		return deltaV / interval;
	}

	distance(pos) {}

	velocity() {
		this.vel.y *= this.acceleration.y;
	}

	move() {
		this.position = {
			x: this.position.x,
		};
	}

	step() {
		this.position.y += 1 * this.vel.y;
		if (this.position.y > document.getElementById('particle').height) {
			this.position.y = 0;
		}
	}

	draw(ctx, ac) {
		ctx.strokeStyle = `rgba(255,255,255,1)`;
		ctx.lineWidth = 10;

		ctx.beginPath();
		ctx.arc(
			this.position.x,
			this.position.y,
			this.random * 40,
			0,
			2 * Math.PI,
		);
		ctx.stroke();
	}

	pos() {
		return this.position;
	}
}

class canvas {
	constructor(canvas, settings) {
		//settings: {fps, size:{x,y}, autoResize, useCursor, autoClear, resScale: {active: true, defaultRes:{x,y}}}

		this.staticRes = settings.size;
		this.resize = settings.autoResize;
		this.autoClear = settings.autoClear;
		this.fps = settings.fps;
		this.useCursor = settings.useCursor;

		this.canvas = canvas;

		this.ctx = this.canvas.getContext('2d');

		this.canvasPos = this.#position();
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

	#calculateSize() {
		if (this.staticRes) {
			this.canvas.width = this.staticRes.x;
			this.canvas.height = this.staticRes.y;
		} else {
			this.canvas.width = this.canvas.offsetWidth;
			this.canvas.height = this.canvas.offsetHeight;
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
		this.cursor.events.hover = true;
	}

	#mouseLeave() {
		this.cursor.events.hover = false;
	}

	//add intersection observer to save recources offscreen

	#resize() {
		this.canvasPos = this.#position(this.canvas);

		if (!this.staticRes && this.resize) {
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
