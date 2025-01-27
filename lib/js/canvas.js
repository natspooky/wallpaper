class s_canvas {
	#drawing = false;
	#cursor = {
		position: { x: 0, y: 0 },
		events: {
			pressed: false,
			hover: false,
		},
	};
	#transform = {
		scale: { x: 1, y: 1 },
		translate: { x: 0, y: 0 },
	};
	#settings;
	#canvas;
	#currentDrawFunc;
	#resObserver;

	constructor(canvas, settings) {
		//settings: {fps, resolution:{x,y}, autoResize, useCursor, autoClear}
		this.time = 0;
		this.#settings = {
			resize: this.#fallback(settings.autoResize, true),
			clear: this.#fallback(settings.autoClear, true),
			fps: this.#fallback(settings.fps, 30),
			cursor: this.#fallback(settings.useCursor, false),
		};

		this.#canvas = {
			body: canvas,
			context: canvas.getContext('2d'),
		};

		this.#canvas = {
			...this.#canvas,
			position: this.#position(),
			size: {
				calc: this.#size(),
				set: this.#fallback(settings.resolution, false),
			},
		};

		this.#calculateSize();
		this.#setEvents();
	}

	static create(canvasName, settings) {
		let canvasElem;

		switch (canvasName.slice(0, 1)) {
			case '.':
				canvasElem = document.createElement('canvas');
				canvasElem.className = canvasName.slice(1, canvasName.length);
				return new s_canvas(canvasElem, settings);
			case '#':
				if (document.querySelectorAll(canvasName).length === 0) {
					canvasElem = document.createElement('canvas');
					canvasElem.id = canvasName.slice(1, canvasName.length);
					return new s_canvas(canvasElem, settings);
				} else {
					return new s_canvas(
						document.querySelector(canvasName),
						settings,
					);
				}
			default:
				return new s_canvas(document.createElement('canvas'), settings);
		}
	}

	get canvas() {
		return this.#canvas.body;
	}

	get context() {
		return this.#canvas.context;
	}

	get cursor() {
		return this.#cursor.position;
	}

	clearCanvas() {
		this.#canvas.context.clearRect(
			0 - this.#transform.translate.x / this.#transform.scale.x,
			0 - this.#transform.translate.y / this.#transform.scale.y,
			this.#canvas.body.width / this.#transform.scale.x,
			this.#canvas.body.height / this.#transform.scale.y,
		);
	}

	stop() {
		this.#drawing = false;
	}

	scaleCanvas(x, y) {
		this.#transform.scale = { x: x, y: y };
		this.#canvas.context.scale(x, y);
	}

	translateCanvas(x, y) {
		this.#transform.translate = { x: x, y: y };
		this.#canvas.context.translate(x, y);
	}

	setStaticSize(x, y) {
		this.#canvas.size.set = { x: x, y: y };
		this.#calculateSize();
	}

	createValueAnimation(settings) {
		return new s_canvas_anim_thread(settings);
	}

	draw(func, customVar) {
		if (this.#drawing) {
			new Promise((resolve) => {
				resolve(this.#currentDrawFunc);
				this.#drawing = false;
			}).then(() => {
				this.#currentDrawFunc = this.#frameGen(func, customVar);
			});
		} else {
			this.#currentDrawFunc = this.#frameGen(func, customVar);
		}
	}

	remove() {
		this.#drawing = false;
		this.#resObserver.unobserve(this.#canvas.body);
		this.#canvas.body.remove();
	}

	// utility

	#checkVal(value) {
		if (value == undefined || value == null) return false;
		return true;
	}

	#fallback(check, fallback) {
		if (this.#checkVal(check)) return check;
		return fallback;
	}

	// end of utility

	// start of sizing functions

	#position() {
		const box = this.#canvas.body.getBoundingClientRect();

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
			x: this.#canvas.body.offsetWidth,
			y: this.#canvas.body.offsetHeight,
		};
	}

	#setSize() {
		if (this.#canvas.size.set) {
			this.#canvas.body.width = this.#canvas.size.set.x;
			this.#canvas.body.height = this.#canvas.size.set.y;
		} else {
			this.#canvas.body.width = this.#canvas.size.calc.x;
			this.#canvas.body.height = this.#canvas.size.calc.y;
		}
	}

	#calculateSize() {
		this.#canvas.position = this.#position();
		this.#canvas.size.calc = this.#size();
	}

	// end of sizing functions

	async #frameGen(func, customVar) {
		this.#drawing = true;
		let then = performance.now(),
			interval = 1000 / this.#settings.fps,
			delta = 0,
			seconds = 0,
			FPSbuffer = 0,
			fps = this.#settings.fps,
			frameDelta = 0,
			time = 0;
		while (this.#drawing) {
			let now = await new Promise(requestAnimationFrame);
			if (now - then < interval - delta) {
				continue;
			}

			frameDelta = (now - then) / 1000;
			time += frameDelta;
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

			if (this.#settings.clear) {
				this.clearCanvas();
			}
			this.#canvas.context.lineWidth = 10;
			this.#canvas.context.beginPath();
			this.#canvas.context.rect(
				0 - this.#transform.translate.x / this.#transform.scale.x,
				0 - this.#transform.translate.y / this.#transform.scale.y,
				this.#canvas.body.width / this.#transform.scale.x,
				this.#canvas.body.height / this.#transform.scale.y,
			);
			this.#canvas.context.stroke();

			func(
				{
					function: this,
					canvas: this.#canvas.body,
					resolution: {
						x: this.#canvas.body.width,
						y: this.#canvas.body.height,
					},
					ctx: this.#canvas.context,
					fps: {
						current: fps,
						target: this.#settings.fps,
						delta: frameDelta,
					},
					time: time,
					cursor: this.#cursor,
				},
				customVar,
			);
		}
		return true;
	}

	#setEvents() {
		this.#resObserver = new ResizeObserver(() => {
			this.#calculateSize();
			if (this.#settings.resize) {
				this.#canvas.position = this.#position();
				this.#setSize();
				this.translateCanvas(
					this.#transform.translate.x,
					this.#transform.translate.y,
				);
				this.scaleCanvas(
					this.#transform.scale.x,
					this.#transform.scale.y,
				);
			}
		});

		this.#resObserver.observe(this.#canvas.body);

		if (this.#settings.cursor) {
			document.addEventListener(
				'mousemove',
				this.#mouseMove.bind(this),
				false,
			);
			this.#canvas.body.addEventListener(
				'mousedown',
				this.#mouseDown.bind(this),
				false,
			);
			document.addEventListener(
				'mouseup',
				this.#mouseUp.bind(this),
				false,
			);
			this.#canvas.body.addEventListener(
				'mouseleave',
				this.#mouseLeave.bind(this),
				false,
			);
			this.#canvas.body.addEventListener(
				'mouseenter',
				this.#mouseEnter.bind(this),
				false,
			);
		}
	}

	#mouseMove(event) {
		this.#cursor.position = {
			x: this.#canvas.size.set
				? (event.pageX *
						(this.#canvas.size.set.x / this.#canvas.size.calc.x) -
						this.#canvas.position.left *
							(this.#canvas.size.set.x /
								this.#canvas.size.calc.x) -
						this.#transform.translate.x) /
				  this.#transform.scale.x
				: (event.pageX -
						this.#canvas.position.left -
						this.#transform.translate.x) /
				  this.#transform.scale.x,
			y: this.#canvas.size.set
				? (event.pageY *
						(this.#canvas.size.set.y / this.#canvas.size.calc.y) -
						this.#canvas.position.top *
							(this.#canvas.size.set.y /
								this.#canvas.size.calc.y) -
						this.#transform.translate.y) /
				  this.#transform.scale.y
				: (event.pageY -
						this.#canvas.position.top -
						this.#transform.translate.y) /
				  this.#transform.scale.y,
		};
	}

	#mouseDown() {
		this.#cursor.events.pressed = true;
	}

	#mouseUp() {
		this.#cursor.events.pressed = false;
	}

	#mouseEnter() {
		this.#cursor.events.hover = true;
	}

	#mouseLeave() {
		this.#cursor.events.hover = false;
	}
}

class s_canvas_anim_thread {
	#timer;

	#start;
	#current = 0;
	#end;
	#duration;
	#timingFunc;
	constructor(settings) {
		this.#start = settings.start;
		this.#current = settings.start;
		this.#end = settings.end;
		this.#duration = settings.duration;
	}

	//time should work between 0 and 1

	step(data) {
		//data.currentfps
		//data.time
		//data.delta
		if (Math.abs(this.#current) >= Math.abs(this.#end)) {
			return;
		}
		this.#current +=
			(data.fps.delta / this.#duration) * (this.#end - this.#start);
	}

	get value() {
		return this.#current;
	}

	linear() {}

	cubicBezier() {}
}

/*

let width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
let height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

*/
