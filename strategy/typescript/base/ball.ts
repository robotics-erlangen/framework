/**
 * @module ball
 * Ball class
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

import * as Constants from "base/constants";
import { Coordinates } from "base/coordinates";
import * as plot from "base/plot";
import { world } from "base/protobuf";
import { Robot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import { GeometryType } from "base/world";

const BALL_QUALITY_FILTER_FACTOR = 0.05;
const MAXSPEED_MIN_ROBOT_DIST = 0.1;

export class Ball {
	/** Ball radius */
	public radius: number = 0.0215;
	/** Time when the ball was lost. Only has meaning when Ball is not visible */
	public lostSince: number = 0;
	/** Current ball position */
	public pos: Readonly<Position> = new Vector(0, 0);
	/** Movement direction, length is speed in m/s */
	public speed: Readonly<Speed> = new Vector(0, 0);
	/** Ball height above the field */
	public posZ: number = 0;
	/** Upwards speed in m/s */
	public speedZ: number = 0;
	public maxSpeed: number = 0;
	public initSpeedZ: number = 0;
	public touchdownPos: Vector | undefined;
	public isBouncing: boolean = false;
	public framesDeceleration: number = Infinity;
	public detectionQuality: number = 0.6;
	public hasRawData: boolean = false;
	public framesDecelerating: number = 0;

	// private attributes
	private _isVisible: boolean = false;
	private _hadRawData: boolean = false; // used for detecting old simulator logs with no recoded ball raw data
	private _ballPosInFrame: Position[] = [];
	private _counter: number = 0;
	private _ballIsNearToRobot: boolean = false;
	// constructor must only be called by world!
	public constructor() {
		//
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	public _toString() {
		const x = this.pos.x.toFixed(3).padStart(6);
		const y = this.pos.x.toFixed(3).padStart(6);
		const speed = this.speed.length().toFixed(1).padStart(3);
		return `Ball(pos = (${x}, ${y}), speed = ${speed})`;
	}

	public toString() {
		return this._toString();
	}

	private _updateLostBall(time: number) {
		// set lost timer
		if (this._isVisible) {
			this._isVisible = false;
			this.lostSince = time;
		}
		if (this._hadRawData) {
			this.detectionQuality *= 1 - BALL_QUALITY_FILTER_FACTOR; // only reduce quality if ball raw data exists
		}
	}

	// Processes ball information from amun, passed by world
	public update(data: world.Ball | undefined, time: number, geom?: GeometryType, robots?: readonly Robot[]) {
		this.hasRawData = false;
		// WARNING: this is the quality BEFORE the frame
		plot.addPlot("Ball.quality", this.detectionQuality);
		// if no ball data is available then no ball was tracked
		if (data == undefined) {
			this._updateLostBall(time);
			return;
		}

		// check if the ball pos or speed are invalid (might result from tracking) -> then ignore the update
		const nextPos = Coordinates.toLocal(new Vector(data.p_x, data.p_y));
		const nextSpeed = Coordinates.toLocal(new Vector(data.v_x, data.v_y));
		const extraDist = 2;
		const SIZE_LIMIT = 1000;
		if (nextPos.isNan() || nextSpeed.isNan() || Math.abs(nextPos.x) > SIZE_LIMIT ||
			Math.abs(nextPos.y) > SIZE_LIMIT || Math.abs(nextSpeed.x) > SIZE_LIMIT || Math.abs(nextSpeed.y) > SIZE_LIMIT) {
			this._updateLostBall(time);
			return;
		}

		if (geom && ((Math.abs(nextPos.y) > geom.FieldHeightHalf + extraDist) || Math.abs(nextPos.x) > geom.FieldWidthHalf + extraDist)) {
			this._updateLostBall(time);
			return;
		}

		let speedLimit = 10;
		if (nextSpeed.lengthSq() > speedLimit * speedLimit) {
			this._updateLostBall(time);
			return;
		}

		// data from amun is in global coordiantes
		let lastSpeedLength = this.speed.length();
		this._isVisible = true;
		this.pos = nextPos;
		this.speed = nextSpeed;
		this.posZ = data.p_z || 0;
		this.speedZ = data.v_z || 0;
		if (data.touchdown_x != undefined && data.touchdown_y != undefined) {
			this.touchdownPos = Coordinates.toLocal(new Vector(data.touchdown_x, data.touchdown_y));
		}
		this.isBouncing = !!data.is_bouncing;

		this._updateTrackedState(data, lastSpeedLength, robots);

		this._updateRawDetections(data.raw);
	}

	private _updateRawDetections(rawData: world.BallPosition[] | undefined) {
		let count = 0;
		if (rawData !== undefined && rawData.length > 0) {
			this._hadRawData = true;
			this.hasRawData = true;
			count = Math.min(1, rawData.length);
		}
		if (this._hadRawData === true) {
			this.detectionQuality = BALL_QUALITY_FILTER_FACTOR * count + (1 - BALL_QUALITY_FILTER_FACTOR) * this.detectionQuality;
		}
	}

	private _updateTrackedState(data: world.Ball, lastSpeedLength: number, robots?: readonly Robot[]) {
		// speed tracking

		if (data.max_speed != undefined) {
			this.maxSpeed = data.max_speed;
		} else {
			// WARNING: do not update this code, the max speed calculation is now in the tracking

			// framesDecelerating counts the number of frames since the last extreme acceleration
			// so even if the ball slowly accelerates, framesDecelerating will not reset
			if (this.speed.length() - lastSpeedLength > 0.2) {
				this.framesDecelerating = 0;
			} else {
				this._ballPosInFrame[this._counter] = this.pos;
				this._counter += 1;
				this.framesDecelerating = this.framesDecelerating + 1;
			}
			// if the ball does not accelerate extremely for 3 frames straight, the current velocity
			// is taken as the maximum ball speed
			if (robots != undefined) {
				for (let framepos of this._ballPosInFrame) {
					for (let r of robots) {
						if (r.pos.distanceToSq(framepos) < MAXSPEED_MIN_ROBOT_DIST * MAXSPEED_MIN_ROBOT_DIST) {
							this._ballIsNearToRobot = true;
							break;
						}
					}
				}
			}
			if (this.framesDecelerating === 3 && this._ballIsNearToRobot) {
				this._ballIsNearToRobot = false;
				this._counter = 0;
				this.maxSpeed = this.speed.length();
			}
			if (this._counter === 3) {
				this._counter = 0;
			}
			if (this.maxSpeed < this.speed.length()) {
				this.maxSpeed = this.maxSpeed + 0.3 * (this.speed.length() - this.maxSpeed);
			}
		}

		plot.addPlot("Ball.maxSpeed", this.maxSpeed);
	}

	/**
	 * Checks whether the ball position is valid
	 * @returns True if ball is visible and position and speed are not NaN
	 */
	public isPositionValid() {
		if (!this._isVisible) {
			return false;
		}
		return !this.pos.isNan() && !this.speed.isNan();
	}
}
