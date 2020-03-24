import * as World from "base/world";

const ALPHA: number = 0.1;
// normaliy 10 milli seconds per frame
const MAX_FRAME_TIME_DIFF: number = 0.02;
const DEACTIVATE: boolean = false;
const START_FRAME_NUMBER: number = 100;

class LowFPS {
	private frameTimeOne: number = 0;
	private prognosis: number = 0;
	private frameCounter: number = 0;
	private lastTime: number = 0;

	public update() {
		this.frameCounter += 1;
		if (DEACTIVATE) {
			return;
		}
		if (this.frameTimeOne === 0) {
			this.frameTimeOne = World.Time;
		} else {
			let frameTimeTwo = World.Time;
			let frameTimeDiff = frameTimeTwo - this.frameTimeOne;
			if (this.prognosis === 0) {
				this.prognosis = frameTimeDiff;
			}
			this.calculateExponentialSmoothing(frameTimeDiff);
			this.frameTimeOne = frameTimeTwo;
		}
	}
	private calculateExponentialSmoothing(frameTimeDiff: number) {
		this.prognosis = ALPHA * frameTimeDiff + (1 - ALPHA) * this.prognosis;
		if (this.prognosis > MAX_FRAME_TIME_DIFF && this.frameCounter > START_FRAME_NUMBER
			&& World.Time - this.lastTime > 5) {
			amun.log("<font color =red>run time too high!</font>");
			this.lastTime = World.Time;
		}
	}
}
export let lowFPSObserver = new LowFPS();
