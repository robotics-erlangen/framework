/*
/// Robot class.
module "Robot"
/*

/**************************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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
import * as MathUtil from "base/mathutil";
import { Path } from "base/path";
import { Trajectory } from "base/trajectory";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";


interface RobotConstants {
	hasBallDistance: number;
	passSpeed: number;
	shootDriveSpeed: number;
	minAngleError: number;
}

export interface RobotAccelerationProfile {
	aSpeedupFMax: number;
	aSpeedupSMax: number;
	aSpeedupPhiMax: number;
	aBrakeFMax: number;
	aBrakeSMax: number;
	aBrakePhiMax: number;
}

interface BallLike {
	pos: Position;
	speed: Speed;
	radius: number;
	posZ: number;
}

interface ControllerInput {
	v_f: number;
	v_s: number;
	omega: number;
	spline: any;
}

interface UserControl {
	speed: Speed;
	omega: number;
	kickStyle: KickStyle;
	kickPower: number;
	dribblerSpeed: number;
}

enum KickStyle {
	linear = "linear",
	chip = "chip"
}

export class Robot {
	/// Values provided by a robot object.
	/// Fields marked with * are only available for own robots
	// @class table
	// @name Robot
	// @field constants table - robot specific constants *(empty for opponents)
	// @field id number - robot id
	// @field generation number - robot generation (-1 for unknown robots)
	// @field year number - year robot was built in *
	// @field pos Vector - current position
	// @field dir number - current direction faced
	// @field isFriendly bool - true if own robot
	// @field speed Vector - current speed (movement direction doesn't have to match with dir)
	// @field angularSpeed number - rotation speed of the robot
	// @field isVisible bool - True if robot is tracked
	// @field radius number - the robot's radius (defaults to 0.09m)
	// @field height number - the robot's height *
	// @field shootRadius number
	// @field dribblerWidth number - Width of the dribbler
	// @field maxSpeed number - maximum speed
	// @field maxAngularSpeed number - maximum angular speed
	// @field acceleration table - Acceleration and deceleration parameters: aSpeedupFMax, aSpeedupSMax, aSpeedupPhiMax, aBrakeFMax, aBrakeSMax, aBrakePhiMax
	// @field lastResponseTime number - strategy time when the last radio response was handled *
	// @field radioResponse table - response from the robot, only set if there is a current response *
	// @field userControl table - command from input devices (fields: speed, omega, kickStyle, kickPower, dribblerSpeed) *
	// @field moveCommand table - command used when robots are dragged with the mouse (fields: time, pos (global)) * (optional)
	// @field prevMoveTo Vector - moveTo from previous trajectory call or undefined

	readonly ALLY_GENERATION_ID: number = 9999;
	readonly GENERATION_2014_ID: number = 3;

	constants: RobotConstants = {
		hasBallDistance: 0.04, // 4 cm, robots where the balls distance to the dribbler is less than 2cm are considered to have the ball [m]
		passSpeed: 3, // speed with which the ball should arrive at the pass target  [m/s]
		shootDriveSpeed: 0.2, // how fast the shoot task drives at the ball [m/s]
		minAngleError: 4 / 180 * Math.PI // minimal angular precision that the shoot task guarantees [in radians]
	};
	id: number;
	pos: Readonly<Position> = new Vector(0, 0);
	speed: Readonly<Speed> = new Vector(0, 0);
	dir: number = 0;
	isFriendly: boolean;
	angularSpeed: number = 0;
	isVisible: boolean = false;
	radius: number;
	shootRadius: number;
	dribblerWidth: number;
	maxSpeed: number;
	maxAngularSpeed: number = 0;
	acceleration: RobotAccelerationProfile;
	lastResponseTime: number = 0;

	// private attributes
	private _toStringCache: string = "";
	protected lostSince: number = 0;
	protected _currentTime: number = 0;
	protected _hasBall: {[offset: number]: boolean} = {};

	/// Creates a new robot object.
	// @param data table/number - data from amun.getTeam or robot id for opponents
	// @param isFriendly boolean - true if own robot
	constructor(id: number) {
		this.radius = 0.09; // set default radius if no specs are available
		this.dribblerWidth = 0.07; // just a good default guess
		this.shootRadius = 0.067; // shoot radius of 2014 generation
		this.id = id;
		this.maxSpeed = 3.5; // Init max speed and acceleration for opponents
		this.maxAngularSpeed = 12;

		this.acceleration = {
			aSpeedupFMax: 3.75,
			aSpeedupSMax: 4.5,
			aSpeedupPhiMax: 41.5,
			aBrakeFMax: 5.75,
			aBrakeSMax: 4,
			aBrakePhiMax: 21.5
		};
		this.isFriendly = false;
	}

	_tostring(): string {
		if (this._toStringCache !== "") {
			return this._toStringCache;
		}
		if (this.pos == undefined || this.id == undefined) {
			this._toStringCache = `Robot(${this.id ? this.id : "?"})`;
		} else {
			this._toStringCache = `Robot(${this.id}, pos ${this.pos._toString})`;
		}
		return this._toStringCache;
	}

	// reset robot commands and update data
	_updateOpponent(state: any, time: number) {
		// check if robot is tracked
		if (state == undefined) {
			if (this.isVisible !== false) {
				this.isVisible = false;
				this.lostSince = time;
			}
			return;
		}

		this._toStringCache = "";
		this.isVisible = true;
		this.pos = Coordinates.toLocal(Vector.createReadOnly(state.p_x, state.p_y));
		this.dir = Coordinates.toLocal(state.phi as number);
		this.speed = Coordinates.toLocal(Vector.createReadOnly(state.v_x, state.v_y));
		this.angularSpeed = state.omega; // do not invert!
	}

	/// Check whether the robot has the given ball.
	// Checks whether the ball is in rectangle in front of the dribbler with hasBallDistance depth. Uses hysteresis for the left and right side of that rectangle
	// @param ball Ball - must be World.Ball to make sure hysteresis will work
	// @param [sideOffset number - extends the hasBall area sidewards]
	// @return boolean - has ball
	hasBall(ball: BallLike, sideOffset: number = 0, manualHasBallDistance: number = this.constants.hasBallDistance) {
		let hasBallDistance = manualHasBallDistance;

		// handle sidewards balls, add extra time for strategy timing jitter
		let latencyCompensation = (ball.speed - this.speed).scaleLength(Constants.systemLatency + 0.03);
		let lclen = latencyCompensation.length();

		// fast fail
		let approxMaxDist = lclen + hasBallDistance + this.shootRadius + ball.radius + this.dribblerWidth / 2 + sideOffset;
		if (ball.pos.distanceToSq(this.pos) > approxMaxDist * approxMaxDist) {
			// reset hystersis
			this._hasBall[sideOffset] = false;
			return false;
		}

		// interpolate vector used for correction to circumvent noise
		let MIN_COMPENSATION = 0.005;
		let BOUND_COMPENSATION_ANGLE = 70 / 180 * Math.PI;
		if (lclen < MIN_COMPENSATION) {
			latencyCompensation = new Vector(0, 0);
		} else if (lclen < 2 * MIN_COMPENSATION) {
			let scale = (lclen - MIN_COMPENSATION) / MIN_COMPENSATION;
			latencyCompensation.scaleLength(scale);
		}
		// local coordinate system
		latencyCompensation = latencyCompensation.rotate(-this.dir);
		// let the vector point away from the robot
		if (latencyCompensation.x < 0) {
			latencyCompensation.scaleLength(-1);
		}
		// bound angle
		lclen = latencyCompensation.length();
		if (lclen > 0.001 && Math.abs(latencyCompensation.angle()) > BOUND_COMPENSATION_ANGLE) {
			let boundAngle = MathUtil.bound(-BOUND_COMPENSATION_ANGLE, latencyCompensation.angle(), BOUND_COMPENSATION_ANGLE);
			latencyCompensation = Vector.fromAngle(boundAngle).scaleLength(lclen);
		}

		// add hasBallDistance
		if (lclen <= 0.001) {
			latencyCompensation = new Vector(hasBallDistance, 0);
		} else {
			latencyCompensation = latencyCompensation.setLength(lclen + hasBallDistance);
		}

		// Ball position relative to dribbler mid
		let relpos = (ball.pos - this.pos).rotate(-this.dir);
		relpos.x = relpos.x - this.shootRadius - ball.radius;
		// calculate position on the dribbler that would have been hit
		let offset = Math.abs(relpos.y - relpos.x * latencyCompensation.y / latencyCompensation.x);
		// local debug = require "base/debug"
		// debug.set("latencyCompensation", latencyCompensation)
		// debug.set("offset", offset)

		// if too far to the sides
		if (offset > this.dribblerWidth / 2 + sideOffset) {
			// reset hystersis
			this._hasBall[sideOffset] = false;
			return false;
		// in hysteresis area without having had the ball
		} else if (offset >= this.dribblerWidth / 2 - 2 * Constants.positionError + sideOffset
					&&  !this._hasBall[sideOffset]) {
			return false;
		}

		this._hasBall[sideOffset] = relpos.x > this.shootRadius * (-1.5)
					&&  relpos.x < latencyCompensation.x  &&  ball.posZ < Constants.maxRobotHeight * 1.2; // *1.2 to compensate for vision error
		return this._hasBall[sideOffset];
	}
}

export class FriendlyRobot extends Robot {

	generation: number;
	year: number;
	maxShotLinear: number;
	maxShotChip: number;
	height: number;
	prevMoveTo: Position | undefined;
	path: Path;
	trajectory: Trajectory;
	radioResponse: any;
	userControl: UserControl | undefined;
	moveCommand: {time: number, pos: Position} | undefined;

	// private attributes
	private _kickStyle?: KickStyle;
	private _kickPower: number = 0;
	private _forceKick: boolean = false;
	private _dribblerSpeed: number = 0;
	private _standbyTimer: number = -1;
	private _standbyTick: boolean = false;
	private _controllerInput: ControllerInput | {} = {};

	constructor(specs: any) {
		super(specs.id);

		// set the robot specs
		this.generation = specs.generation;
		this.year = specs.year;
		this.id = specs.id;
		this.radius = specs.radius;
		this.height = specs.height;
		if (specs.shoot_radius) {
			this.shootRadius = specs.shoot_radius;
		} else if (specs.angle) { // calculate shoot radius
			this.shootRadius = this.radius * Math.cos(specs.angle / 2) - 0.005;
		} else {
			this.shootRadius = this.radius;
		}
		if (specs.dribbler_width) {
			this.dribblerWidth = specs.dribbler_width;
		} else {// estimate dribbler width
			this.dribblerWidth = 2 * Math.sqrt(this.radius * this.radius - this.shootRadius * this.shootRadius);
		}
		this.maxSpeed = specs.v_max != undefined ? specs.v_max : 2;
		this.maxAngularSpeed = specs.omega_max != undefined ? specs.omega_max : 5;
		this.maxShotLinear = specs.shot_linear_max != undefined ? specs.shot_linear_max : 8; // TODO: 6.5????
		this.maxShotChip = specs.shot_chip_max != undefined ? specs.shot_chip_max : 3;
		if (!specs.strategy) {
			this.acceleration = {
				aSpeedupFMax: 1.0, aSpeedupSMax: 1.0, aSpeedupPhiMax: 1.0,
				aBrakeFMax: 1.0, aBrakeSMax: 1.0, aBrakePhiMax: 1.0
			};
		} else {
			let acc = specs.strategy;
			this.acceleration.aSpeedupFMax = acc.a_speedup_f_max ? acc.a_speedup_f_max : 1.0;
			this.acceleration.aSpeedupSMax = acc.a_speedup_s_max ? acc.a_speedup_s_max : 1.0;
			this.acceleration.aSpeedupPhiMax = acc.a_speedup_phi_max ? acc.a_speedup_phi_max : 1.0;
			this.acceleration.aBrakeFMax = acc.a_brake_f_max ? acc.a_brake_f_max : 1.0;
			this.acceleration.aBrakeSMax = acc.a_brake_s_max ? acc.a_brake_s_max : 1.0;
			this.acceleration.aBrakePhiMax = acc.a_brake_phi_max ? acc.a_brake_phi_max : 1.0;
		}

		this.isFriendly = true;
		this.trajectory = new Trajectory(this);
		this.path = new Path(this.id);
	}

	_updatePathBoundaries(geometry: any, aoi: any) {
		if (aoi != undefined) {
			this.path.setBoundary(aoi.x1, aoi.y1, aoi.x2, aoi.y2);
		} else {
			this.path.setBoundary(
				-geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
				-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
				geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
				geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02);
		}
	}

	_updateUserControl(command: any) {
		if (command == undefined) {
			this.userControl = undefined;
			return;
		}

		let v = new Vector(command.v_s, command.v_f);
		let omega = command.omega;
		if (command.local) {
			// correctly align local and strategy coordinate system
			// this.dir can be undefined if robot was not yet visible
			let dir = this.isVisible ? this.dir : Math.PI / 2;
			v = v.rotate(dir - Math.PI / 2);
		} else {
			// global to strategy coordinate mapping
			v = Coordinates.toLocal(v);
		}
		this.userControl = { speed: v, omega: omega,
			kickStyle: command.kick_style, kickPower: command.kick_power,
			dribblerSpeed: command.dribbler };
	}

	_command() {
		let STANDBY_DELAY = 30;
		let standby = this._standbyTimer >= 0 && (this._currentTime - this._standbyTimer > STANDBY_DELAY);

		let result: any = {
			kick_style: this._kickStyle,
			kick_power: this._kickPower > 0 ? this._kickPower : undefined,
			force_kick: this._forceKick,
			dribbler: this._dribblerSpeed,
			standby: standby
		};
		if (this._controllerInput !== {}) {
			let input: ControllerInput = <ControllerInput> this._controllerInput;
			result.controller = input;
			result.v_f = input.v_f;
			result.v_s = input.v_s;
			result.omega = input.omega;
		}
		return result;
	}

	_update(state: any, time: number, radioResponses?: any[]) {
		// keep current time for use by setStandby
		this._currentTime = time;
		// bypass override check in setControllerInput
		this._controllerInput = {}; // halt robot by default
		this.shootDisable(); // disable shoot
		this.setDribblerSpeed(0); // stop dribbler
		this.setStandby(false); // activate robot

		if (radioResponses && radioResponses.length > 0) {
			// only keep the last and most current radio response
			this.radioResponse = radioResponses[radioResponses.length - 1];
			this.lastResponseTime = time;
		} else {
			// clear reponse field if response is missing
			this.radioResponse = undefined;
		}

		this._updateOpponent(state, time);
	}

	/// Set output from trajectory planing on robot
	// The robot is halted by default if no command is set for it. To tell a robot to follow its old trajectory call robot:setControllerInput(undefined)
	// @param input Spline - Target points for the controller, in global coordinates!
	setControllerInput(input: any) {
		// Forbid overriding controller input except with halt
		if (input && input.spline && (this._controllerInput === {} || (<ControllerInput> this._controllerInput).spline)) {
			throw new Error("Setting controller input twice");
		}
		this._controllerInput = input;
	}

	/// Disable shoot
	shootDisable() {
		this._kickStyle = undefined;
		this._kickPower = 0;
		this._forceKick = false;
	}

	/// Enable linear kick.
	// The different kick styles are exclusive, that is only one of them can be active at a time.
	// @param speed number - Shoot speed [m/s]
	// @param ignoreLimit bool - Don't enforce shoot speed limit, if true
	shoot(speed: number, ignoreLimit: boolean) {
		if (!ignoreLimit) {
			speed = Math.min(Constants.maxBallSpeed, speed);
		}
		speed = MathUtil.bound(0.05, speed, this.maxShotLinear);
		this._kickStyle = KickStyle.linear;
		this._kickPower = speed;
		vis.addCircle("shoot command", this.pos, this.radius + 0.04, vis.colors.mediumPurple, undefined, undefined, undefined, 0.03);
	}

	/// Enable chip kick.
	// The different kick styles are exclusive, that is only one of them can be active at a time.
	// @param distance number - Chip distance [m]
	chip(distance: number) {
		distance = MathUtil.bound(0.05, distance, this.maxShotChip);
		this._kickStyle = KickStyle.chip;
		this._kickPower = distance;
		vis.addCircle("shoot command", this.pos, this.radius + 0.04, vis.colors.darkPurple, undefined, undefined, undefined, 0.03);
	}

	/// Force the robot to shoot even if the IR isn't triggered
	forceShoot() {
		this._forceKick = true;
	}

	/// Enable dribbler
	// (0=off, 1=on) @param power number - robotspecific value between 0 and 1
	setDribblerSpeed(speed: number) {
		this._dribblerSpeed = speed;
	}

	/// Halts robot
	halt() {
		this.setControllerInput({});
	}

	/// Set standby
	// @param standby boolean - enable standby for robot if true
	setStandby(standby: boolean) {
		if (standby) {
			// start timer
			if (this._standbyTimer < 0) {
				this._standbyTimer = this._currentTime;
			}
			this._standbyTick = true;
		} else {
			// disable standby if disabled two times in a row
			if (!this._standbyTick) {
				this._standbyTimer = -1;
			}
			this._standbyTick = false;
		}
	}

	/// Calculate shoot speed neccessary for linear shoot to reach the target with a certain speed.
	// This is limited to maxShootLinear and maxBallSpeed.
	// @param destSpeed number - Ball speed at destination [m/s]
	// @param distance number - Distance to chip [m]
	// @param ignoreLimit bool - Don't enforce rule given shoot speed limit, if true
	// @return number - Speed to shoot with [m/s]
	calculateShootSpeed(destSpeed: number, distance: number, ignoreLimit: boolean): number {
		let maxShot = ignoreLimit ? this.maxShotLinear : Math.min(this.maxShotLinear, Constants.maxBallSpeed);
		if (destSpeed >= maxShot) {
			return maxShot;
		}

		let fastBallBrake = Constants.fastBallDeceleration;
		let slowBallBrake = Constants.ballDeceleration;
		let ballSwitchRatio = Constants.ballSwitchRatio;

		// solve(v_0+a_f*t_end=v_d, t_end);
		// solve(integrate(v_0+t*a_f,t, 0, t_end)=d,v_0);
		let v_fast = Math.sqrt(destSpeed * destSpeed - 2 * fastBallBrake * distance);

		if (v_fast < maxShot && v_fast * ballSwitchRatio < destSpeed) {
			return v_fast;
		}

		// solve(v_0*switch=v_0+a_f*t_mid, t_mid);
		// solve(v_0+a_f*t_mid+a_s*(t_end-t_mid)=v_d, t_end);
		// solve(integrate(v_0+a_f*t,t,0,t_mid)+integrate(v_0+a_f*t_mid+a_s*(t-t_mid),t,t_mid,t_end)=d, v_0);
		let a_s = slowBallBrake;
		let a_f = fastBallBrake;
		let sw = ballSwitchRatio;
		let d = distance;
		let v_d = destSpeed;
		let v_0 = Math.sqrt(a_f * (2 * a_s * d - v_d * v_d) / ((a_s - a_f) * sw * sw - a_s));

		if (v_0 > maxShot) {
			return maxShot;
		} else {
			return v_0;
		}
	}
}
