/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

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
			this._calculateExponentialSmoothing(frameTimeDiff);
			this._frameTimeOne = frameTimeTwo;
		}
	}
	private _calculateExponentialSmoothing(frameTimeDiff: number) {
		this._prognosis = ALPHA * frameTimeDiff + (1 - ALPHA) * this._prognosis;
		if (this._prognosis > MAX_FRAME_TIME_DIFF && this._frameCounter > START_FRAME_NUMBER
			&& World.Time - this._lastTime > 5) {
			amun.log("<font color =red>run time too high!</font>");
			this._lastTime = World.Time;
		}
	}
}
export let lowFPSObserver = new LowFPS();
