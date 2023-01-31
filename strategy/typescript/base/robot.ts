/**
 * @module robot
 * Robot class
 */

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

import { accelerationsByTeam, RobotSpecs } from "base/accelerations";
import { throwInDebug } from "base/amun";
import * as Constants from "base/constants";
import { Coordinates } from "base/coordinates";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Path } from "base/path";
import * as pb from "base/protobuf";
import { RobotAccelerationProfile, Trajectory } from "base/trajectory";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";


interface RobotConstants {
	hasBallDistance: number;
	passSpeed: number;
	shootDriveSpeed: number;
	minAngleError: number;
}

// re-export to be visible from other modules
export { RobotAccelerationProfile };

interface BallLike {
	pos: Position;
	speed: Speed;
	radius: number;
	posZ: number;
}

export const REUSE_LAST_TRAJECTORY = Symbol("REUSE_LAST_TRAJECTORY");
export const HALT = Symbol("HALT");

export type ControllerInput =
	typeof REUSE_LAST_TRAJECTORY
	| typeof HALT
	| TrajectoryCommand;

export type TrajectoryCommand = {
	spline: pb.robot.Spline[];
	v_f?: undefined;
	v_s?: undefined;
	omega?: undefined;
} | {
	spline?: undefined;
	v_f: number;
	v_s: number;
	omega: number;
};

/* eslint-disable @typescript-eslint/naming-convention */
interface GeomType {
	FieldWidthHalf: number;
	FieldHeightHalf: number;
	BoundaryWidth: number;
}
/* eslint-enable @typescript-eslint/naming-convention */

export interface UserControl {
	speed: Speed;
	omega: number;
	kickStyle?: pb.robot.Command.KickStyle;
	kickPower?: number;
	dribblerSpeed?: number;
}

export interface RobotState {
	/** Robot ID */
	id: number;
	/** Current position */
	pos: Position;
	/** Current speed (movement direction doesn't have to match with dir) */
	speed: Speed;
	/** Current direction faced */
	dir: number;
	/** Rotation speed of the robot */
	angularSpeed: number;
}

/**
 * Fields marked with * are only available for own robots
 */
export class Robot implements RobotState {

	readonly ALLY_GENERATION_ID: number = 9999;
	readonly GENERATION_2014_ID: number = 3;

	/** robot specific constants * (empty for opponents) */
	constants: RobotConstants = {
		hasBallDistance: 0.04, // 4 cm, robots where the balls distance to the dribbler is less than 2cm are considered to have the ball [m]
		passSpeed: 3, // speed with which the ball should arrive at the pass target  [m/s]
		shootDriveSpeed: 0.2, // how fast the shoot task drives at the ball [m/s]
		minAngleError: geom.degreeToRadian(4) // minimal angular precision that the shoot task guarantees [in radians]
	};

	// See RobotState
	id: number;
	pos: Position = new Vector(0, 0);
	speed: Speed = new Vector(0, 0);
	dir: number = 0;
	angularSpeed: number = 0;

	/** true if own robot */
	isFriendly: boolean;
	/** True if robot is tracked */
	isVisible: boolean = false;
	/** the robot's radius (defaults to 0.09m) */
	radius: number;
	shootRadius: number;
	/** Width of the dribbler */
	dribblerWidth: number;
	/** maximum speed */
	maxSpeed: number;
	/** maximum angular speed */
	maxAngularSpeed: number = 0;
	/** Acceleration and deceleration parameters: aSpeedupFMax, aSpeedupSMax, aSpeedupPhiMax, aBrakeFMax, aBrakeSMax, aBrakePhiMax */
	acceleration: RobotAccelerationProfile;
	/** strategy time when the last radio response was handled * */
	lastResponseTime: number = 0;
	lostSince: number = 0;
	/** poition of the robots dribbler */
	readonly dribblerPos: Readonly<Position> = new Vector(0, 0);

	// private attributes
	private _toStringCache: string = "";
	protected _currentTime: number = 0;
	protected _hasBall: { [offset: number]: boolean } = {};

	/**
	 * Creates a new robot object.
	 * @param id - The robot's id
	 */
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

	_toString(): string {
		if (this._toStringCache !== "") {
			return this._toStringCache;
		}
		if (this.pos == undefined || this.id == undefined) {
			this._toStringCache = `Robot(${this.id != undefined ? this.id : "?"})`;
		} else {
			this._toStringCache = `Robot(${this.id}, pos ${this.pos._toString()})`;
		}
		return this._toStringCache;
	}

	toString() {
		return this._toString();
	}

	copyState(): RobotState {
		/* Note that speed and pos are shallow copied. However, Vectors are
		 * readonly and copy on write, so this is ok.
		 *
		 * If more fields are to be added, object spread syntax (`...this`) may
		 * be used. At the moment, I don't want to copy all fields
		 */
		return {
			id: this.id,
			pos: this.pos,
			speed: this.speed,
			dir: this.dir,
			angularSpeed: this.angularSpeed,
		};
	}

	/** Reset robot commands and update data */
	_updateOpponent(state: pb.world.Robot | undefined, time: number) {
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
		this.pos = Coordinates.toLocal(new Vector(state.p_x, state.p_y));
		this.dir = Coordinates.toLocal(state.phi as number);
		this.speed = Coordinates.toLocal(new Vector(state.v_x, state.v_y));
		this.angularSpeed = state.omega; // do not invert!
		(this.dribblerPos as Vector) = this.pos + Vector.fromPolar(this.dir, this.shootRadius);
	}

	/**
	 * Check whether the robot has the given ball.
	 * Checks whether the ball is in rectangle in front of the dribbler with hasBallDistance depth. Uses hysteresis for the left and right of that rectangle.
	 * @param ball - Must be World.Ball to make sure hysteresis will work
	 * @param sideOffset - Extends the hasBall sidewards
	 * @returns Has ball
	 */
	hasBall(ball: BallLike, sideOffset: number = 0, manualHasBallDistance: number = this.constants.hasBallDistance) {
		let hasBallDistance = manualHasBallDistance;

		// handle sidewards balls, add extra time for strategy timing jitter
		let latencyCompensation = (ball.speed - this.speed) * (Constants.systemLatency + 0.03);
		let lclen = latencyCompensation.length();

		// fast fail
		let approxMaxDist = lclen + hasBallDistance + this.shootRadius + ball.radius + this.dribblerWidth / 2 + sideOffset;
		if (ball.pos.distanceToSq(this.pos) > approxMaxDist * approxMaxDist) {
			// reset hystersis
			this._hasBall[sideOffset] = false;
			return false;
		}

		// interpolate vector used for correction to circumvent noise
		const MIN_COMPENSATION = 0.005;
		const BOUND_COMPENSATION_ANGLE = geom.degreeToRadian(70);
		if (lclen < MIN_COMPENSATION) {
			latencyCompensation = new Vector(0, 0);
		} else if (lclen < 2 * MIN_COMPENSATION) {
			let scale = (lclen - MIN_COMPENSATION) / MIN_COMPENSATION;
			latencyCompensation = latencyCompensation * scale;
		}
		// local coordinate system
		latencyCompensation = latencyCompensation.rotated(-this.dir);
		// let the vector point away from the robot
		if (latencyCompensation.x < 0) {
			latencyCompensation = -latencyCompensation;
		}
		// bound angle
		lclen = latencyCompensation.length();
		if (lclen > 0.001 && Math.abs(latencyCompensation.angle()) > BOUND_COMPENSATION_ANGLE) {
			let boundAngle = MathUtil.bound(-BOUND_COMPENSATION_ANGLE, latencyCompensation.angle(), BOUND_COMPENSATION_ANGLE);
			latencyCompensation = Vector.fromPolar(boundAngle, lclen);
		}

		// add hasBallDistance
		if (lclen <= 0.001) {
			latencyCompensation = new Vector(hasBallDistance, 0);
		} else {
			latencyCompensation = latencyCompensation.withLength(lclen + hasBallDistance);
		}

		// Ball position relative to dribbler mid
		let relpos = (ball.pos - this.pos).rotated(-this.dir);
		relpos = relpos.withX(relpos.x - this.shootRadius - ball.radius);
		// calculate position on the dribbler that would have been hit
		let offset = Math.abs(relpos.y - relpos.x * latencyCompensation.y / latencyCompensation.x);
		// debug.set("latencyCompensation", latencyCompensation)
		// debug.set("offset", offset)

		const offsetHysteresis = this._hasBall[sideOffset] ? this.dribblerWidth / 4 : 0;
		// if too far to the sides
		if (offset > this.dribblerWidth / 2 + sideOffset + offsetHysteresis) {
			// reset hystersis
			this._hasBall[sideOffset] = false;
			return false;
		// in hysteresis area without having had the ball
		} else if (offset >= this.dribblerWidth / 2 - 2 * Constants.positionError + sideOffset
					&& !this._hasBall[sideOffset]) {
			return false;
		}

		const latencyXHysteresis = this._hasBall[sideOffset] ? latencyCompensation.x / 2 : 0;

		this._hasBall[sideOffset] = relpos.x > this.shootRadius * (-1.5)
					&& relpos.x < latencyCompensation.x + latencyXHysteresis && ball.posZ < Constants.maxRobotHeight * 1.2; // *1.2 to compensate for vision error
		return this._hasBall[sideOffset];
	}

	updateSpecs(teamname: string) {
		let accel = accelerationsByTeam[teamname];
		if (accelerationsByTeam[teamname]) {
			this.maxSpeed = accel.vmax;
			this.maxAngularSpeed = accel.vangular;
			this.acceleration = accel.profile;
			amun.log(`updated specs with team ${teamname}`);
		}
	}
}

export class FriendlyRobot extends Robot {
	/** robot generation (-1 for unknown robots) */
	generation: number;
	/** year robot was built in */
	year: number;
	maxShotLinear: number;
	maxShotChip: number;
	/** the robot's height */
	height: number;
	/** moveTo from previous trajectory call or undefined */
	prevMoveTo: Position | undefined;
	path: Path;
	trajectory: Trajectory;
	/** response from the robot, only set if there is a current response */
	radioResponse: pb.robot.RadioResponse | undefined;
	/** command from input devices (fields: speed, omega, kickStyle, kickPower, dribblerSpeed) */
	userControl: UserControl | undefined;
	/** command used when robots are dragged with the mouse (fields: time, pos (global)) (optional) */
	moveCommand: { time: number; pos: Position } | undefined;

	centerToDribbler: number | undefined;


	// private attributes
	private _kickStyle?: pb.robot.Command.KickStyle;
	private _kickPower: number = 0;
	private _forceKick: boolean = false;
	private _dribblerSpeed: number = 0;
	private _standbyTimer: number = -1;
	private _standbyTick: boolean = false;
	private _controllerInput: ControllerInput = REUSE_LAST_TRAJECTORY;

	private _dribblerSpeedVisualized = false;

	constructor(specs: pb.robot.Specs) {
		super(specs.id);

		// set the robot specs
		this.generation = specs.generation;
		this.year = specs.year;
		this.id = specs.id;
		this.radius = specs.radius != undefined ? specs.radius : 0.08;
		this.height = specs.height != undefined ? specs.height : 0.14;
		if (specs.shoot_radius != undefined) {
			this.shootRadius = specs.shoot_radius;
		} else if (specs.angle != undefined) { // calculate shoot radius
			this.shootRadius = this.radius * Math.cos(specs.angle / 2) - 0.005;
		} else {
			this.shootRadius = this.radius;
		}
		if (specs.dribbler_width != undefined) {
			this.dribblerWidth = specs.dribbler_width;
		} else { // estimate dribbler width
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
			this.acceleration.aSpeedupFMax = acc.a_speedup_f_max != undefined ? acc.a_speedup_f_max : 1.0;
			this.acceleration.aSpeedupSMax = acc.a_speedup_s_max != undefined ? acc.a_speedup_s_max : 1.0;
			this.acceleration.aSpeedupPhiMax = acc.a_speedup_phi_max != undefined ? acc.a_speedup_phi_max : 1.0;
			this.acceleration.aBrakeFMax = acc.a_brake_f_max != undefined ? acc.a_brake_f_max : 1.0;
			this.acceleration.aBrakeSMax = acc.a_brake_s_max != undefined ? acc.a_brake_s_max : 1.0;
			this.acceleration.aBrakePhiMax = acc.a_brake_phi_max != undefined ? acc.a_brake_phi_max : 1.0;
		}

		this.isFriendly = true;
		this.trajectory = new Trajectory(this);
		this.path = new Path(this.id);

		if (specs.angle != undefined) {
			this.centerToDribbler = this.radius * Math.sin((Math.PI - specs.angle) * 0.5);
		}
	}

	_updatePathBoundaries(geometry: GeomType, aoi: pb.world.TrackingAOI | undefined) {
		if (aoi != undefined) {
			this.path.setBoundary(aoi.x1, aoi.y1, aoi.x2, aoi.y2);
		} else {
			this.path.setBoundary(
				-geometry.FieldWidthHalf - geometry.BoundaryWidth - 0.02,
				-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
				geometry.FieldWidthHalf + geometry.BoundaryWidth + 0.02,
				geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02);
		}
	}

	_updateUserControl(command: pb.robot.Command | undefined) {
		if (command == undefined) {
			this.userControl = undefined;
			return;
		}

		let v = new Vector(command.v_s || 0, command.v_f || 0);
		let omega = command.omega || 0;
		if (command.local) {
			// correctly align local and strategy coordinate system
			// this.dir can be undefined if robot was not yet visible
			let dir = this.isVisible ? this.dir : Math.PI / 2;
			v = v.rotated(dir - Math.PI / 2);
		} else {
			// global to strategy coordinate mapping
			v = Coordinates.toLocal(v);
		}
		this.userControl = { speed: v, omega: omega,
			kickStyle: command.kick_style, kickPower: command.kick_power,
			dribblerSpeed: command.dribbler };
	}

	_command() {
		const STANDBY_DELAY = 30;
		let standby = this._standbyTimer >= 0 && (this._currentTime - this._standbyTimer > STANDBY_DELAY);

		let result: pb.robot.Command = {
			kick_style: this._kickStyle,
			kick_power: this._kickPower > 0 ? this._kickPower : undefined,
			force_kick: this._forceKick,
			dribbler: this._dribblerSpeed,
			standby: standby
		};

		if (this._controllerInput === HALT) {
			result.controller = {};
		} else if (this._controllerInput !== REUSE_LAST_TRAJECTORY) {
			result.controller = {
				spline: this._controllerInput.spline,
			};
			result.v_f = this._controllerInput.v_f;
			result.v_s = this._controllerInput.v_s;
			result.omega = this._controllerInput.omega;
		}

		return result;
	}

	_update(state: pb.world.Robot, time: number, radioResponses?: pb.robot.RadioResponse[]) {
		// keep current time for use by setStandby
		this._currentTime = time;
		// Halt robot by default
		this._controllerInput = HALT;
		this.shootDisable(); // disable shoot
		this._dribblerSpeedVisualized = false;
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

	/**
	 * Set output from trajectory planing on robot. The robot is halted by
	 * default if no command is set for it. To tell a robot to follow its old
	 * trajectory, call
	 *   setControllerInput(REUSE_LAST_TRAJECTORY)
	 * @param input - Target points for the controller, in global coordinates!
	 */
	setControllerInput(input: ControllerInput) {
		// Forbid overriding controller input except with halt
		if (input !== HALT && this._controllerInput !== HALT) {
			throw new Error("Setting controller input twice");
		}
		this._controllerInput = input;
	}

	/** Disable shoot */
	shootDisable() {
		this._kickStyle = undefined;
		this._kickPower = 0;
		this._forceKick = false;
	}

	/**
	 * Enable linear kick
	 * The different kick styles are exclusive, that is only one of them can be active at a time.
	 * @see chip
	 * @param speed - Shoot speed [m/s]
	 * @param ignoreLimit - Don't enforce shoot speed limit, if true
	 */
	shoot(speed: number, ignoreLimit: boolean = false) {
		if (!ignoreLimit) {
			speed = Math.min(Constants.maxBallSpeed, speed);
		}
		speed = MathUtil.bound(0.05, speed, this.maxShotLinear);
		this._kickStyle = pb.robot.Command.KickStyle.Linear;
		this._kickPower = speed;
		vis.addCircle("shoot command", this.pos, this.radius + 0.04, vis.colors.mediumPurple, undefined, undefined, undefined, 0.03);
	}

	/**
	 * Enable chip kick.
	 * The different kick styles are exclusive, that is only one of them can be active at a time.
	 * @see shoot
	 * @param distance - Chip distance [m]
	 */
	chip(distance: number) {
		distance = MathUtil.bound(0.05, distance, this.maxShotChip);
		this._kickStyle = pb.robot.Command.KickStyle.Chip;
		this._kickPower = distance;
		vis.addCircle("shoot command", this.pos, this.radius + 0.04, vis.colors.darkPurple, undefined, undefined, undefined, 0.03);
	}

	/** Force to robot to shoot, even if the IR is not triggered */
	forceShoot() {
		this._forceKick = true;
	}

	/**
	 * Enable dribbler
	 * @param speed - robotspecific value between 0 and 1 (0 = off, 1 = on)
	 */
	setDribblerSpeed(speed: number) {
		if (speed === 0 && this._dribblerSpeedVisualized) {
			throwInDebug("Trying to reset dribbler speed after already setting it. The visualization will be wrong");
		}

		if (speed > 0 && !this._dribblerSpeedVisualized) {
			this._dribblerSpeedVisualized = true;
			vis.addCircle(
				"b/robot: dribbler speed", this.pos, this.radius + 0.04,
				vis.colors.magentaHalf, false, false, undefined, 0.03
			);
		}

		this._dribblerSpeed = speed;
	}

	/** Halts robot */
	halt() {
		this.path.setHalted();
		this.setControllerInput(HALT);
	}

	/**
	 * Set standby
	 * @param standby - enable standby for robot if true
	 */
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
}
