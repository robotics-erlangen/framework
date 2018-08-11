/*
// Ball class.
//module "Ball"
*/

/**************************************************************************
*   Copyright 2018 Alexander Danzer, Michael Eischer, Andreas Wendler     *
*   Robotics Erlangen e.V.                                                *
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

import * as Constants from "../base/constants";
import {Coordinates} from "../base/coordinates";
import * as plot from "../base/plot";
import {Vector, Position, Speed} from "../base/vector";


/// Values provided by Ball
// @class table
// @name Ball
// @field pos Vector - Current ball position
// @field posZ number - Ball height above the field
// @field speed Vector - Movement direction, length is speed in m/s
// @field speedZ number - Upwards speed in m/s
// @field radius number - Ball radius
// @field deceleration Vector - Current deceleration that is assumed to brake the ball
// @field brakeTime number - Time in seconds until the ball stops moving
// @field lostSince number - Time when the ball was lost. Only has meaning when Ball isn't visible

let BALL_QUALITY_FILTER_FACTOR = 0.05;

export class Ball {
	radius: number = 0.0215;
	lostSince: number = 0;
	pos: Readonly<Position> = new Vector(0, 0);
	speed: Readonly<Speed> = new Vector(0, 0);
	posZ: number = 0;
	speedZ: number = 0;
	deceleration: number = 0;
	maxSpeed: number = 0;
	initSpeedZ: number = 0;
	touchdownPos: Vector | undefined;
	isBouncing: boolean = false;
	framesDeceleration: number = Infinity;
	detectionQuality: number = 0.6;
	hasRawData: boolean = false;
	framesDecelerating: number = 0;

	// private attributes
	private _isVisible: boolean = false;

	// constructor must only be called by world!
	constructor() {}

	__tostring () {
		//return string.format("Ball(pos = (%6.3f, %6.3f), speed = %3.1f)",
		//	this.pos.x, this.pos.y, this.speed.length());
		// TODO: string.format doesn't exist, but number of digits would be nice
		return "Ball(pos = (" + this.pos.x + ", " + this.pos.y + "), speed = " + this.speed.length + ")";
	}

	_updateLostBall (time: number) {
		// set lost timer
		if (this._isVisible) {
			this._isVisible = false;
			this.lostSince = time;
		}
		this.detectionQuality = this.detectionQuality * (1 - BALL_QUALITY_FILTER_FACTOR);
	}

	// Processes ball information from amun, passed by world
	_update (data: any, time: number) {
		this.hasRawData = false;
		// WARNING: this is the quality BEFORE the frame
		plot.addPlot("Ball.quality", this.detectionQuality);
		// if no ball data is available then no ball was tracked
		if (data == undefined) {
			this._updateLostBall(time);
			return;
		}

		// check if the ball pos or speed are invalid (might result from tracking) -> then ignore the update
		let nextPos = Coordinates.toLocal(Vector.createReadOnly(data.p_x, data.p_y));
		let nextSpeed = Coordinates.toLocal(Vector.createReadOnly(data.v_x, data.v_y));
		let SIZE_LIMIT = 1000;
		if (nextPos.isNan()  ||  nextSpeed.isNan()  ||  Math.abs(nextPos.x) > SIZE_LIMIT  ||
			Math.abs(nextPos.y) > SIZE_LIMIT  ||  Math.abs(nextSpeed.x) > SIZE_LIMIT  ||  Math.abs(nextSpeed.y) > SIZE_LIMIT) {
			this._updateLostBall(time);
			return;
		}

		// data from amun is in global coordiantes
		let lastSpeedLength = this.speed.length();
		this._isVisible = true;
		this.pos = nextPos;
		this.speed = nextSpeed;
		this.posZ = data.p_z;
		this.speedZ = data.v_z;
		if (data.touchdown_x  &&  data.touchdown_y) {
			this.touchdownPos = Coordinates.toLocal(Vector.createReadOnly(data.touchdown_x, data.touchdown_y));
		}
		this.isBouncing = data.is_bouncing;

		this._updateTrackedState(lastSpeedLength);

		this._updateRawDetections(data.raw);
	}

	_updateRawDetections (rawData: any[] | undefined) {
		if (rawData == undefined) {
			return;
		}
		let count = Math.min(1, rawData.length);
		this.detectionQuality = BALL_QUALITY_FILTER_FACTOR * count + (1 - BALL_QUALITY_FILTER_FACTOR) * this.detectionQuality;
		this.hasRawData = count > 0;
	}

	_updateTrackedState (lastSpeedLength: number) {
		// speed tracking
		// framesDecelerating counts the number of frames since the last extreme acceleration
		// so even if the ball slowly accelerates, framesDecelerating will not reset
		if (this.speed.length() - lastSpeedLength > 0.2) {
			this.framesDecelerating = 0;
		} else {
			this.framesDecelerating = this.framesDecelerating + 1;
		}
		// if the ball does not accelerate extremely for 3 frames straight, the current velocity
		// is taken as the maximum ball speed
		if (this.framesDecelerating == 3) {
			this.maxSpeed = this.speed.length();
		}
		if (this.maxSpeed < this.speed.length()) {
			this.maxSpeed = this.maxSpeed + 0.3 * (this.speed.length() - this.maxSpeed);
		}
		plot.addPlot("Ball.maxSpeed", this.maxSpeed);

		// set the deceleration depending on the ball's state (sliding or rolling)
		if (this.speed.length() > Constants.ballSwitchRatio * this.maxSpeed) {
			this.deceleration = Constants.fastBallDeceleration;
		} else {
			this.deceleration = Constants.ballDeceleration;
		}
	}

	/// Checks whether the ball position is valid
	// @return boolean - True if ball is visible and position and speed are not NaN
	isPositionValid () {
		if (!this._isVisible) {
			return false;
		}
		return !this.pos.isNan() && !this.speed.isNan();
	}
}