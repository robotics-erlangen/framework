import * as World from "base/world";

const ALPHA: number = 0.1;
// normaliy 10 milli seconds per frame
const MAX_FRAME_TIME_DIFF: number = 0.02;
const DEACTIVATE: boolean = false;
const START_FRAME_NUMBER: number = 100;

class LowFPS {
	private _frameTimeOne: number = 0;
	private _prognosis: number = 0;
	private _frameCounter: number = 0;
	private _lastTime: number = 0;

	public update() {
		this._frameCounter += 1;
		if (DEACTIVATE) {
			return;
		}
		if (this._frameTimeOne === 0) {
			this._frameTimeOne = World.Time;
		} else {
			let frameTimeTwo = World.Time;
			let frameTimeDiff = frameTimeTwo - this._frameTimeOne;
			if (this._prognosis === 0) {
				this._prognosis = frameTimeDiff;
			}
			this.calculateExponentialSmoothing(frameTimeDiff);
			this._frameTimeOne = frameTimeTwo;
		}
	}
	private calculateExponentialSmoothing(frameTimeDiff: number) {
		this._prognosis = ALPHA * frameTimeDiff + (1 - ALPHA) * this._prognosis;
		if (this._prognosis > MAX_FRAME_TIME_DIFF && this._frameCounter > START_FRAME_NUMBER
			&& World.Time - this._lastTime > 5) {
			amun.log("<font color =red>run time too high!</font>");
			this._lastTime = World.Time;
		}
	}
}
export let lowFPSObserver = new LowFPS();
