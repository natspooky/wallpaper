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
		value: {
			special: {
				meta: false,
				ctrl: false,
				shift: false,
				alt: false,
			},
			current: null,
			previous: null,
		}, // remove this and replace with the better system
		events: {
			repeating: false,
			pressed: false,
		},
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
	#canvas;
	#currentDrawFunc;
	#resObserver;
	#devData = {
		frameHolder: [],
	};
	#moveTimer;

	constructor(canvas, settings) {
		//settings: {fps, resolution:{x,y}, autoResize, autoResizeFunc, useCursor, autoClear, useKeys}
		this.#settings = {
			resize: this.#fallback(settings.autoResize, true),
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

	get width() {
		return this.#canvas.body.width;
	}

	get height() {
		return this.#canvas.body.height;
	}

	get translate() {
		return this.#transform.translate;
	}

	get scale() {
		return this.#transform.scale;
	}

	get context() {
		return this.#canvas.context;
	}

	get cursor() {
		return this.#cursor;
	}

	endDraw() {
		this.#drawing = false;
	}

	/*
var output = document.getElementById('output'),
    pressed = {},
    keyDownCount = 0,
    keyDownTime = 0;

window.onkeydown = function(e) {
    if ( pressed[e.code] ) return;
    pressed[e.code] = true;
    if (!keyDownCount) keyDownTime = e.timeStamp;
    keyDownCount++;
};
    
window.onkeyup = function(e) {
    if ( !pressed[e.code] ) return;
    pressed[e.code] = false;
    keyDownCount--;
    if (keyDownCount) return;
    var duration = ( e.timeStamp - keyDownTime ) / 1000;
    var today = new Date();
    var date = today.getDate()+'-'+(today.getMonth()+1)+'-'+today.getFullYear();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = (date+' '+time).replace(/\b\d\b/g, "0$&"); 
    output.innerHTML += dateTime + ' - Key(s) pressed for ' + duration + ' seconds</p>';
}
*/

	clearCanvas() {
		this.#canvas.context.clearRect(
			0 - this.#transform.translate.x / this.#transform.scale.x,
			0 - this.#transform.translate.y / this.#transform.scale.y,
			this.#canvas.body.width / this.#transform.scale.x,
			this.#canvas.body.height / this.#transform.scale.y,
		);
	}

	scaleCanvas(x, y) {
		this.#transform.scale.x *= x;
		this.#transform.scale.y *= y; // change this to make it scaleable
		this.#canvas.context.scale(x, y);
	}

	translateCanvas(x, y) {
		this.#transform.translate.x += x;
		this.#transform.translate.y += y;
		this.#canvas.context.translate(x, y);
	}

	resetCanvasTransform() {
		this.#transform.scale = { x: 1, y: 1 };
		this.#transform.translate = { x: 0, y: 0 };
		this.#canvas.context.resetTransform();
	}

	setSize(x, y) {
		this.#canvas.size.set = { x: x, y: y };
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

	setColor(value) {
		this.#canvas.context.fillStyle = value;
		this.#canvas.context.strokeStyle = value;
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

			if (this.#settings.canvasInfo) {
				this.#canvasData(fps, this.#settings.fps, frameDelta);
			}

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
		}
		return true;
	}

	#setEvents() {
		this.#resObserver = new ResizeObserver(() => {
			this.#calculateSize();
			if (this.#settings.resize) {
				this.#canvas.position = this.#position();
				this.#setSize();
				this.#canvas.context.translate(
					this.#transform.translate.x,
					this.#transform.translate.y,
				);
				this.#canvas.context.scale(
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
		if (event.repeat) {
			this.#key.events.repeating = true;
			return;
		}
		this.#key.events.pressed = true;
		this.#key.value.previous = this.#key.value.current;
		this.#key.value.current = event.key;
		this.#key.value.special.meta = event.metaKey;
		this.#key.value.special.ctrl = event.ctrlKey;
		this.#key.value.special.shift = event.shiftKey;
		this.#key.value.special.alt = event.altKey;
	}

	#keyUp(event) {
		this.#key.events = { pressed: false, repeating: false };
		this.#key.value.special = {
			meta: false,
			ctrl: false,
			shift: false,
			alt: false,
		};
	}

	#canvasData(current, target, delta) {
		this.#canvas.context.scale(
			1 / this.#transform.scale.x,
			1 / this.#transform.scale.y,
		);

		this.#canvas.context.translate(
			-this.#transform.translate.x,
			-this.#transform.translate.y,
		);

		if (this.#devData.frameHolder.length >= 100) {
			this.#devData.frameHolder.shift();
		}

		this.#devData.frameHolder.push(Math.min(target * delta, 50));

		this.setColor('#fff');

		//console.log(this.#devData.frameHolder);
		this.#devData.frameHolder.forEach((item, index) => {
			this.#canvas.context.fillRect(index, 50 - item, 1, item);
		});

		this.#canvas.context.font = '24px serif';
		this.#canvas.context.fillText(`current: ${current}`, 110, 45);
		this.#canvas.context.fillText(`target: ${target}`, 110, 20);

		if (this.#key.events.pressed) {
			this.#canvas.context.fillText(this.#key.value.current, 10, 80);
		}

		this.setColor('#000');

		this.#canvas.context.scale(
			this.#transform.scale.x,
			this.#transform.scale.y,
		);

		this.#canvas.context.translate(
			this.#transform.translate.x,
			this.#transform.translate.y,
		);
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

class particleOrb {
	#particles = {
		count: 0,
		array: [],
	};

	constructor(data) {}
}

class particle {
	#position;
	constructor(x, y, z) {
		this.#position = {
			x: x,
			y: y,
			z: z,
		};
	}
}
