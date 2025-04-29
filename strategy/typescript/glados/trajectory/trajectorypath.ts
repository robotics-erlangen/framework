import * as Constants from "base/constants";
import { Coordinates } from "base/coordinates";
import * as Field from "base/field";
import * as Option from "base/option";
import * as pb from "base/protobuf";
import * as Referee from "base/referee";
import { FriendlyRobot, TrajectoryCommand } from "base/robot";
import { TrajectoryHandler, RobotLike, ToTargetResult } from "base/trajectory";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { DirectRotation } from "glados/trajectory/directrotation";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as Rating from "glados/util/rating";

// enables several visualizations for the state of the PID controller
const VISUALIZE_PID_STATE = Option.addOption("Visualize PID controller state in strategy", false);

class PID {
	private _p: number;
	private _i: number;
	private _d: number;
	private _name: string;
	private _robot: RobotLike;

	private _maxLength: number;

	private _integral: Vector = new Vector(0, 0);
	private _previousError: Vector = new Vector(0, 0);

	public constructor(maxLength: number, p: number, i: number, d: number, name: string, robot: RobotLike) {
		this._maxLength = maxLength;
		this._p = p;
		this._i = i;
		this._d = d;
		this._name = name + robot.id + (World.TeamIsBlue ? "b" : "y");
		this._robot = robot;
	}

	public reset() {
		this._integral = new Vector(0, 0);
	}

	public update(error: Vector) {
		let timeDiff = World.TimeDiff;

		let pOut = error * this._p;
		this._integral = this._integral + error * timeDiff;
		let iOut = this._integral * this._i;

		let derivative = (error - this._previousError) / timeDiff;
		let dOut = derivative * this._d;

		let output = pOut + iOut + dOut;

		if (output.length() > this._maxLength) {
			output = output.withLength(this._maxLength);
		}

		if (VISUALIZE_PID_STATE) {
			vis.addPath(`Position Control/${this._name}/integral`, [this._robot.pos, this._robot.pos + this._integral], vis.colors.cyan);
			vis.addPath(`Position Control/${this._name}/output components`, [this._robot.pos, this._robot.pos + pOut], vis.colors.brown);
			vis.addPath(`Position Control/${this._name}/output components`, [this._robot.pos, this._robot.pos + iOut], vis.colors.pink);
			vis.addPath(`Position Control/${this._name}/output components`, [this._robot.pos, this._robot.pos + dOut], vis.colors.blue);
			vis.addPath(`Position Control/${this._name}/output`, [this._robot.pos, this._robot.pos + output], vis.colors.white);
			vis.addPath(`Position Control/${this._name}/error`, [this._robot.pos, this._robot.pos + error], vis.colors.red);
		}

		this._previousError = error;
		return output;
	}
}

// enables a more expensive, but also a little more
// useful visualization for trajectories
const DETAILED_TRAJECTORY = Option.addOption("Use detailed trajectory", false);

type Trajectory = { pos: Position; speed: Speed; time: number }[];

export class TrajectoryPathResult extends ToTargetResult {
	/** The desired target position in local coordinates */
	public readonly target: Position;
	/** The desired end speed in local coordinates */
	public readonly targetSpeed: Speed;
	/** The desired orientation at the target in local coordinates */
	public readonly targetDir: number;
	/**  Only the values **in this struct** are in global coordinates */
	private _trajectory: Trajectory;

	public constructor(
			robot: RobotLike,
			target: Position,
			targetSpeed: Speed,
			targetDir: number,
			trajectory: Trajectory
	) {
		super(robot);
		this.target = target;
		this.targetSpeed = targetSpeed;
		this.targetDir = targetDir;
		this._trajectory = trajectory;
	}

	public get timeToDest(): number {
		return this._trajectory[this._trajectory.length - 1].time;
	}

	public get dest(): Position {
		return Coordinates.toLocal(this._trajectory[this._trajectory.length - 1].pos);
	}

	public get path(): Position[] {
		const MIN_POINT_DISTANCE = DETAILED_TRAJECTORY ? 0.005 : 0.1; // minimum distance between points to draw both
		const SAMPLES = DETAILED_TRAJECTORY ? 40 : 20;

		if (this._trajectory.length === 0) {
			return [];
		}

		const positions: Position[] = [];
		const totalTime = this.timeToDest;
		let lastDrawn = this._trajectory[0].pos;
		for (let i = 0; i < SAMPLES; i++) {
			const time = i * totalTime / (SAMPLES - 1);
			const pos = this.posAtTime(time);
			if (i === 0 || i === SAMPLES - 1 || pos.distanceTo(lastDrawn) > MIN_POINT_DISTANCE) {
				positions.push(pos);
				lastDrawn = pos;
			}
		}
		return positions;
	}

	public posAtTime(time: number): Position {
		if (this._trajectory.length === 0) {
			return new Vector(0, 0);
		}
		for (let i = 0; i < this._trajectory.length - 1; i++) {
			let next = this._trajectory[i + 1];
			if (next.time > time) {
				let current = this._trajectory[i];
				let tFactor = (time - current.time) / (next.time - current.time);
				let v = current.speed + tFactor * (next.speed - current.speed);

				return Coordinates.toLocal(current.pos + (current.speed + v) * 0.5 * (time - current.time));
			}
		}
		if (this._trajectory.length > 0) {
			return Coordinates.toLocal(this._trajectory[this._trajectory.length - 1].pos);
		}
		return new Vector(0, 0);
	}

	public speedAtTime(time: number): Speed {
		for (let i = 0; i < this._trajectory.length - 1; i++) {
			let next = this._trajectory[i + 1];
			if (next.time > time) {
				let current = this._trajectory[i];
				let tFactor = (time - current.time) / (next.time - current.time);
				let v = current.speed + tFactor * (next.speed - current.speed);
				return Coordinates.toLocal(v);
			}
		}
		if (this._trajectory.length > 0) {
			return Coordinates.toLocal(this._trajectory[this._trajectory.length - 1].speed);
		}
		return new Vector(0, 0);
	}

	public accAtTime(time: number): Vector {
		for (let i = 0; i < this._trajectory.length - 1; i++) {
			let next = this._trajectory[i + 1];
			if (next.time > time) {
				let current = this._trajectory[i];
				let acc = (next.speed - current.speed) / (next.time - current.time);
				return Coordinates.toLocal(acc);
			}
		}
		return new Vector(0, 0);
	}

	public vis() {
		super.vis();
		let directionVector = Vector.fromPolar(this.targetDir, 0.09);
		vis.addPath("MoveTo", [this.target, this.target + directionVector], vis.colors.yellowHalf);
		if (this.targetSpeed.length() > 0.001) {
			vis.addPath("MoveTo", [this.target, this.target + this.targetSpeed], vis.colors.whiteQuarter);
		}
	}
}

export class TrajectoryPath extends TrajectoryHandler<[Position, number, number, Speed, number, boolean], TrajectoryPathResult> {
	private _rotationCalculation: DirectRotation = new DirectRotation();
	private _speedPID: PID = new PID(1.0, 0.3, 0.2, 0, "speed", this._robot);
	private _positionPID: PID = new PID(2, 4.5, 0.6, 0.1, "position", this._robot);
	private _dribbleWarning = true;
	private _slowSpeedHysteresis: boolean = false;

	private _lastResult: TrajectoryPathResult | undefined = undefined;

	public update(targetPos: Position, targetDir: number = 0, maxSpeed: number = this._robot.maxSpeed,
			endSpeed: Speed = new Vector(0, 0), accelScale: number = 1.0, dribble: boolean = false): [TrajectoryCommand, TrajectoryPathResult] {

		if (this._dribbleWarning && dribble) {
			this._dribbleWarning = false;
			amun.log("TrajectoryPath does not implement dribble = true right now");
		}

		PathHelper.insertObstacles(this._robot as FriendlyRobot, false, targetPos);

		// insert default values
		if (Referee.isSlowDriveState()) {
			maxSpeed = Math.min(maxSpeed, (World.IsLargeField ? Constants.stopSpeed : 1) - 0.25);
		}

		targetPos = Coordinates.toGlobal(targetPos);
		endSpeed = Coordinates.toGlobal(endSpeed);
		targetDir = Coordinates.toGlobal(targetDir);
		let robotPos = Coordinates.toGlobal(this._robot.pos);
		let rSpeed = this._robot.speed;
		// check if the robot is outside the field and the speed points further outside the field
		if (!Field.isInField(this._robot.pos) && this._robot.pos.dot(this._robot.speed) > 0) {
			// remove speed component that points further outside the field, but keep the remaining component
			// this ensures that we do not get stuck trying to drive parallel to the field border (but close to it)
			if (this._robot.pos.x > World.Geometry.FieldWidthHalf) {
				rSpeed = rSpeed.withX(Math.min(0, rSpeed.x));
			} else if (this._robot.pos.x < -World.Geometry.FieldWidthHalf) {
				rSpeed = rSpeed.withX(Math.max(0, rSpeed.x));
			} else if (this._robot.pos.y > World.Geometry.FieldHeightHalf) {
				rSpeed = rSpeed.withY(Math.min(0, rSpeed.y));
			} else if (this._robot.pos.y < -World.Geometry.FieldHeightHalf) {
				rSpeed = rSpeed.withY(Math.max(0, rSpeed.y));
			}
		}
		let robotSpeed = Coordinates.toGlobal(rSpeed);
		let robotDir = Coordinates.toGlobal(this._robot.dir);

		// find position and speed on last path
		let startPos = robotPos;
		let startSpeed = robotSpeed;
		let futureStartPos = robotPos;
		let futureStartSpeed = robotSpeed;
		let usePositionControl = robotPos.distanceTo(targetPos) > 0.2
			&& World.WorldStateSource() === pb.world.WorldSource.REAL_LIFE;
		if (usePositionControl && this._lastResult !== undefined) {
			let [testPos, testSpeed] = TrajectoryPath._calculateClosestPoint(robotPos, robotSpeed, this._lastResult, 0);
			vis.addCircle("trajectory-closest", Coordinates.toLocal(testPos), 0.03, vis.colors.red);
			if (testPos.distanceTo(robotPos) < 0.1 && testSpeed.distanceTo(robotSpeed) < 0.3) {
				startPos = testPos;
				startSpeed = testSpeed;
				[futureStartPos, futureStartSpeed] = TrajectoryPath._calculateClosestPoint(robotPos, robotSpeed, this._lastResult, 0.01);
			}
		}

		// calculate acceleration (also used for braking)
		let baseAcceleration = Math.min(Math.abs(this._robot.acceleration.aSpeedupFMax), Math.abs(this._robot.acceleration.aBrakeFMax));
		let accelerate = baseAcceleration * accelScale;

		// call C++ path finding
		let trajectory = this._robot.path.getTrajectory(startPos, startSpeed, targetPos, endSpeed,
			maxSpeed, accelerate);
		const result = new TrajectoryPathResult(
			this._robot,
			Coordinates.toLocal(targetPos),
			Coordinates.toLocal(endSpeed),
			Coordinates.toLocal(targetDir),
			trajectory,
		);

		// if the trajectory intersects a robot obstacle, brake as fast as possible
		// same thing if no trajectory was found (to prevent driving further into obstacles)
		if ((robotSpeed.length() > 1 && this._robot.path.maxIntersectingObstaclePrio() === PathHelper.PRIORITIES.ROBOT) ||
				trajectory.length === 0) {
			const spline = [{ t_start: 0, t_end: Infinity,
				x: { a0: robotPos.x, a1: 0, a2: 0, a3: 0 },
				y: { a0: robotPos.y, a1: 0, a2: 0, a3: 0 },
				phi: { a0: robotDir, a1: 0, a2: 0, a3: 0 }
			}];
			const trajectoryCommand = { spline };
			const result = new TrajectoryPathResult(
				this._robot,
				Coordinates.toLocal(targetPos),
				Coordinates.toLocal(endSpeed),
				Coordinates.toLocal(targetDir),
				[{ pos: robotPos, speed: new Vector(0, 0), time: 0 }],
			);
			return [trajectoryCommand, result];
		}

		this._lastResult = result;

		// calculate rotation
		let rotationExponentialTime = 0.1;
		let rotationAccelerationFactor = 1;

		const rotationFactor = 0.2 + 0.8 * Rating.valueToRating(result.timeToDest, 1.5, 0.5);

		let rotAccelerate = Math.abs(this._robot.acceleration
			? this._robot.acceleration.aSpeedupPhiMax : 1.0) * rotationAccelerationFactor * rotationFactor;
		let rotBrake = -Math.abs(this._robot.acceleration
			? this._robot.acceleration.aBrakePhiMax : 1.0) * rotationAccelerationFactor * rotationFactor;
		let rotMaxSpeed = this._robot.maxAngularSpeed * rotationFactor;
		let [angularSpeed, angularAccel] = this._rotationCalculation.calculateRotationHysteresis(robotDir,
			this._robot.angularSpeed, targetDir, rotAccelerate, rotBrake, rotMaxSpeed, rotationExponentialTime);

		// finish and return trajectory
		let queryTime;
		let startDriving = false;
		if (World.WorldStateSource() !== pb.world.WorldSource.REAL_LIFE) {
			if (result.timeToDest < 0.4) {
				queryTime = Math.min(0.1, (0.4 - result.timeToDest) / 4);
			} else {
				queryTime = 0;
			}
		} else {
			queryTime = 0.08;
			let testSpeed = Coordinates.toGlobal(result.speedAtTime(queryTime));
			if (robotSpeed.length() > testSpeed.length()) {
				queryTime = 0.03;
			}
			if (robotPos.distanceTo(targetPos) < 0.1) {
				queryTime = 0.1;
			} else {
				const QUERY_OFFSET = 0.3;
				let nextSpeed = Coordinates.toGlobal(result.speedAtTime(QUERY_OFFSET));

				let slowSpeedLimit = this._slowSpeedHysteresis ? 0.4 : 0.2;
				this._slowSpeedHysteresis = false;
				if (nextSpeed.length() > startSpeed.length() + 0.02 && robotSpeed.length() < slowSpeedLimit) {
					queryTime = QUERY_OFFSET;
					this._slowSpeedHysteresis = true;
					startDriving = true;
				}
			}
		}
		let speed = Coordinates.toGlobal(result.speedAtTime(queryTime));
		let acc = Coordinates.toGlobal(result.accAtTime(queryTime));

		if (startDriving) {
			speed = speed * 1.5;
			acc = acc * 1.5;
			vis.addCircle("Position Control", this._robot.pos, 0.2, vis.colors.red);
		}

		if (usePositionControl) {
			let posDiff = this._positionPID.update(futureStartPos - robotPos);
			let speedDiff = this._speedPID.update(futureStartSpeed - robotSpeed);
			let controlSpeed = posDiff + speedDiff;
			speed = speed.withLength(Math.max(0, speed.length() - controlSpeed.length()));
			speed = speed + controlSpeed;
			vis.addPathRaw("Position Control", [robotPos, robotPos + posDiff + speed], vis.colors.blue);
			vis.addPathRaw("Position Control", [robotPos, robotPos + posDiff + acc], vis.colors.orange);
			vis.addPathRaw("Position Control", [robotPos, robotPos + posDiff + speedDiff], vis.colors.red);
		}

		const spline = [{ t_start: 0, t_end: Infinity,
			x: { a0: robotPos.x, a1: speed.x, a2: acc.x / 2, a3: 0 },
			y: { a0: robotPos.y, a1: speed.y, a2: acc.y / 2, a3: 0 },
			phi: { a0: robotDir, a1: angularSpeed, a2: angularAccel / 2, a3: 0 }
		}];
		return [{ spline }, result];
	}

	private static _calculateClosestPoint(position: Position, speed: Speed, result: TrajectoryPathResult, offset: number) {
		let bestPos = position, bestSpeed = speed;
		let bestTime = Infinity;
		let bestDistance = Infinity;
		for (let i = 0; i < 50; i++) {
			let time = i / 1000;
			let pos = Coordinates.toGlobal(result.posAtTime(time));
			let speed = Coordinates.toGlobal(result.speedAtTime(time));

			if (pos.distanceTo(position) < bestDistance) {
				bestDistance = pos.distanceTo(position);
				bestPos = pos;
				bestSpeed = speed;
				bestTime = time;
			}
		}
		bestPos = Coordinates.toGlobal(result.posAtTime(bestTime + offset));
		bestSpeed = Coordinates.toGlobal(result.speedAtTime(bestTime + offset));
		return [bestPos, bestSpeed];
	}
}
