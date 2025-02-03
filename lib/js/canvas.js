class s_canvas {
	#drawing = false;
	#cursor = {
		position: { x: 0, y: 0 },
		clickPosition: {
			start: { x: 0, y: 0 },
			end: { x: 0, y: 0 },
		},
		events: {
			pressed: false,
			hover: false,
			moving: false,
		},
	};
	#key = {
		keys: {},
		events: {
			pressed: false,
		},
		keyCount: 0,
	};
	#transform = {
		scale: { x: 1, y: 1 },
		translate: { x: 0, y: 0 },
	};
	#savedData = {
		scale: { x: 1, y: 1 },
		translate: { x: 0, y: 0 },
	};
	#settings;
	#paused = false;
	#canvas;
	#currentDrawFunc;
	#observers = {};

	#devData = {
		frameHolder: [],
	};
	#moveTimer;

	constructor(canvas, settings) {
		//settings: {fps, resolution:{x,y}, autoResize, autoResizeFunc, useCursor, autoClear, useKeys}
		this.#settings = {
			resizeFunc: 0,
			clear: this.#fallback(settings.autoClear, true),
			fps: this.#fallback(settings.fps, 30),
			cursor: this.#fallback(settings.useCursor, false),
			key: this.#fallback(settings.useKeys, false),
			canvasInfo: this.#fallback(settings.canvasInfo, false),
		};

		this.#canvas = {
			body: canvas,
			context: canvas.getContext('2d'),
		};

		this.#canvas = {
			...this.#canvas,
			size: {
				static: this.#fallback(settings.resolution, false),
			},
		};

		this.#setValues();
		this.#setEvents();
	}

	static create(canvasName, settings) {
		const observe = (canvas, settings) => {
			let x = new s_canvas(canvas, settings);
			let obs = new MutationObserver((mutations) => {
				x.setValues();
				obs.disconnect();
			});

			obs.observe(x.canvas, {
				attributes: true,
			});

			return x;
		};
		let canvas = document.createElement('canvas');
		switch (canvasName.slice(0, 1)) {
			case '.':
				canvas.className = canvasName.slice(1, canvasName.length);
				return observe(canvas, settings);
			case '#':
				if (document.querySelectorAll(canvasName).length === 0) {
					canvas.id = canvasName.slice(1, canvasName.length);
					return observe(canvas, settings);
				} else {
					return new s_canvas(
						document.querySelector(canvasName),
						settings,
					);
				}
			default:
				return observe(canvas, settings);
		}
	}

	get canvas() {
		return this.#canvas.body;
	}

	get context() {
		return this.#canvas.context;
	}

	get width() {
		return this.#canvas.body.width;
	}

	get height() {
		return this.#canvas.body.height;
	}

	get resolution() {
		return { x: this.width, y: this.height };
	}

	get translate() {
		return this.#transform.translate;
	}

	get scale() {
		return this.#transform.scale;
	}

	get transform() {
		return { scale: this.scale, translate: this.translate };
	}

	get cursor() {
		return this.#cursor;
	}

	get key() {
		return this.#key;
	}

	get drawState() {
		return this.#drawing;
	}

	get playBackState() {
		return this.#paused;
	}

	changeSettings() {
		//figure out how to make this work
	}

	setValues() {
		this.#setValues();
		console.log(this.width, this.height);
	}

	setup(func) {
		func(this);
	}

	endDraw() {
		this.#drawing = false;
	}

	pause() {
		this.#paused = true;
	}

	play() {
		this.#paused = false;
	}

	clearCanvas() {
		this.#canvas.context.clearRect(
			0 - this.#transform.translate.x / this.#transform.scale.x,
			0 - this.#transform.translate.y / this.#transform.scale.y,
			this.#canvas.body.width / this.#transform.scale.x,
			this.#canvas.body.height / this.#transform.scale.y,
		);
	}

	drawBackground() {
		this.#canvas.context.fillRect(
			0 - this.#transform.translate.x / this.#transform.scale.x,
			0 - this.#transform.translate.y / this.#transform.scale.y,
			this.#canvas.body.width / this.#transform.scale.x,
			this.#canvas.body.height / this.#transform.scale.y,
		);
	}

	scaleCanvas(x, y) {
		this.#transform.scale.x *= x;
		this.#transform.scale.y *= y;
		this.#canvas.context.scale(x, y);
	}

	translateCanvas(x, y) {
		this.#transform.translate.x += x * this.#transform.scale.x;
		this.#transform.translate.y += y * this.#transform.scale.y;
		this.#canvas.context.translate(x, y);
	}

	setSize(x, y) {
		this.#canvas.size.static = { x: x, y: y };
		this.#calculateSize();
	}

	saveCanvas() {
		this.#savedData = this.#transform;
		this.#canvas.context.save();
	}

	restoreCanvas() {
		this.#transform = this.#savedData;
		this.#canvas.context.restore();
	}

	resetCanvasTransform() {
		this.#transform = {
			scale: { x: 1, y: 1 },
			translate: { x: 0, y: 0 },
		};
		this.#canvas.context.resetTransform();
	}

	setColor(value) {
		this.#canvas.context.fillStyle = value;
		this.#canvas.context.strokeStyle = value;
	}

	createAnimation(settings) {
		let threads = [];
		for (const setting of settings) {
			threads.push(new s_canvas_anim_thread(setting));
		}
		return threads;
	}

	draw(func, customVar) {
		if (this.#drawing) {
			new Promise((resolve) => {
				resolve(this.#currentDrawFunc);
				this.#drawing = false;
			}).then((val) => {
				if (val)
					this.#currentDrawFunc = this.#frameGen(func, customVar);
			});
		} else {
			this.#currentDrawFunc = this.#frameGen(func, customVar);
		}
	}

	remove() {
		this.#drawing = false;
		this.#observers.resize.unobserve(this.#canvas.body);
		this.#observers.resize.unobserve(document.body);
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

		return {
			top: Math.round(box.top + scrollTop - clientTop),
			left: Math.round(box.left + scrollLeft - clientLeft),
		};
	}

	#size() {
		return {
			x: this.#canvas.body.offsetWidth,
			y: this.#canvas.body.offsetHeight,
		};
	}

	#setSize() {
		if (this.#canvas.size.static) {
			this.#canvas.body.width = this.#canvas.size.static.x;
			this.#canvas.body.height = this.#canvas.size.static.y;
		} else {
			this.#canvas.body.width = this.#canvas.size.calc.x;
			this.#canvas.body.height = this.#canvas.size.calc.y;
		}
		this.#canvas.context.translate(
			this.#transform.translate.x,
			this.#transform.translate.y,
		);
		this.#canvas.context.scale(
			this.#transform.scale.x,
			this.#transform.scale.y,
		);
	}

	#calculateSize() {
		this.#canvas.position = this.#position();
		this.#canvas.size.calc = this.#size();
	}

	// end of sizing functions

	async #frameGen(func, customVar) {
		this.#drawing = true;
		const interval = 1000 / this.#settings.fps;
		let then = performance.now(),
			delta = 0,
			seconds = 0,
			FPSbuffer = 0,
			fps = this.#settings.fps,
			frameDelta = 0,
			time = 0;
		while (this.#drawing) {
			let now = await new Promise(requestAnimationFrame);
			if (now - then < interval - delta || this.#paused) continue;

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

			if (this.#settings.clear) this.clearCanvas();

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
					key: this.#key,
					transform: this.#transform,
				},
				customVar,
			);

			if (this.#settings.canvasInfo)
				this.#canvasData(fps, this.#settings.fps, frameDelta);
		}
		return true;
	}

	#setValues() {
		this.#calculateSize();
		this.#setSize();
	}

	#setEvents() {
		this.#observers.resize = new ResizeObserver(() => {
			this.#setValues();
		});

		this.#observers.resize.observe(this.#canvas.body);
		this.#observers.resize.observe(document.body);

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

		if (this.#settings.key) {
			document.addEventListener(
				'keydown',
				this.#keyDown.bind(this),
				false,
			);
			document.addEventListener('keyup', this.#keyUp.bind(this), false);
		}
	}

	#mouseMove(event) {
		this.#cursor.events.moving = true;
		clearTimeout(this.#moveTimer);
		this.#moveTimer = setTimeout(() => {
			this.#cursor.events.moving = false;
		}, 10);
		this.#cursor.position = {
			x: this.#canvas.size.static
				? (event.pageX *
						(this.#canvas.size.static.x /
							this.#canvas.size.calc.x) -
						this.#canvas.position.left *
							(this.#canvas.size.static.x /
								this.#canvas.size.calc.x) -
						this.#transform.translate.x) /
				  this.#transform.scale.x
				: (event.pageX -
						this.#canvas.position.left -
						this.#transform.translate.x) /
				  this.#transform.scale.x,
			y: this.#canvas.size.static
				? (event.pageY *
						(this.#canvas.size.static.y /
							this.#canvas.size.calc.y) -
						this.#canvas.position.top *
							(this.#canvas.size.static.y /
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
		this.#cursor.clickPosition.start = this.#cursor.position;
		this.#cursor.events.pressed = true;
	}

	#mouseUp() {
		this.#cursor.clickPosition.end = this.#cursor.position;
		this.#cursor.events.pressed = false;
	}

	#mouseEnter() {
		this.#cursor.events.hover = true;
	}

	#mouseLeave() {
		this.#cursor.events.hover = false;
	}

	#keyDown(event) {
		if (this.#key.keys[event.code]) return;
		this.#key.events.pressed = true;
		this.#key.keys[event.code] = true;
		//if (!this.#key.data.keyPressCount)
		//	this.#key.data.keyPressDuration = event.timeStamp;
		this.#key.keyCount++;
	}

	#keyUp(event) {
		if (!this.#key.keys[event.code]) return;
		this.#key.keys[event.code] = false;
		this.#key.keyCount--;
		if (this.#key.keyCount) return;
		this.#key.events.pressed = false;
		// duration = (event.timeStamp - this.#key.data.keyPressDuration) / 1000;
	}

	#canvasData(current, target, delta) {
		this.saveCanvas();

		this.resetCanvasTransform();

		if (this.#devData.frameHolder.length >= 100) {
			this.#devData.frameHolder.shift();
		}

		this.#devData.frameHolder.push(Math.min(target * delta, 50));

		this.setColor('#fff');

		if (!this.#settings.clear) {
			this.#canvas.context.clearRect(0, 0, 300, 50);
		}

		//console.log(this.#devData.frameHolder);
		this.#devData.frameHolder.forEach((item, index) => {
			this.#canvas.context.fillRect(index, 50 - item, 1, item);
		});

		this.#canvas.context.font = '24px serif';
		this.#canvas.context.fillText(`current: ${current}`, 110, 45);
		this.#canvas.context.fillText(`target: ${target}`, 110, 20);
		this.#canvas.context.font = '10px sans-serif';

		this.setColor('#000');

		this.restoreCanvas();
	}
}

class s_canvas_anim_thread {
	#start;
	#current = 0;
	#end;
	#duration;
	#completed = false;
	#time;
	constructor(settings) {
		this.#start = settings.start;
		this.#current = settings.start;
		this.#end = settings.end;
		this.#duration = settings.duration;
	}

	//time should work between 0 and 1

	step(data) {
		this.#time += data.fps.delta / this.#duration;
		return this.cubicBezier(this.#time, [...bezier]);
	}

	get value() {
		return this.#current;
	}

	get completed() {
		return this.#completed;
	}

	linear(value) {
		return value;
	}

	cubicBezier(time, p0, p1, p2, p3) {
		return (
			(1 - time) ** 3 * p0 +
			time * p1 * (3 * (1 - time) ** 2) +
			p2 * (3 * (1 - time) * time ** 2) +
			p3 * time ** 3
		);
	}
}
