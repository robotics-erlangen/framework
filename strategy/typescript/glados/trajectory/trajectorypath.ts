import * as Constants from "base/constants";
import { Coordinates } from "base/coordinates";
import * as debug from "base/debug";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { TrajectoryHandler, TrajectoryResult } from "base/trajectory";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { DirectRotation } from "glados/trajectory/directrotation";
import * as PathHelper from "glados/trajectory/pathhelper";

type Trajectory = { pos: Position, speed: Speed, time: number}[];

class PID {
	p: number;
	i: number;

	maxLength: number;

	integral: Vector = new Vector(0, 0);

	constructor(maxLength: number, p: number, i: number) {
		this.maxLength = maxLength;
		this.p = p;
		this.i = i;
	}

	reset() {
		this.integral = new Vector(0, 0);
	}

	update(error: Vector) {
		let timeDiff = World.TimeDiff;

		let pOut = error * this.p;
		this.integral += error * timeDiff;
		let iOut = this.integral * this.i;

		let output = pOut + iOut;

		if (output.length() > this.maxLength) {
			output.setLength(this.maxLength);
		}
		return output;
	}
}

export class TrajectoryPath extends TrajectoryHandler {
	private rotationCalculation: DirectRotation = new DirectRotation();
	private speedPID: PID = new PID(1.0, 3, 0.7);
	private positionPID: PID = new PID(2.0, 13, 4.5);

	private lastTrajectory: Trajectory = [];

	public canHandle(...args: any[]): boolean {
		return true;
	}

	public update(...args: [Position, number, number, Speed, number]): TrajectoryResult {
		return this._update(args[0], args[1], args[2], args[3], args[4]);
	}

	private _update(targetPos: Position, targetDir: number = 0, maxSpeed: number = this._robot.maxSpeed,
			endSpeed: Speed = new Vector(0, 0), accelScale: number = 1.0): TrajectoryResult {

		let directionVector = Vector.fromAngle(targetDir).scaleLength(0.09);
		vis.addPath("MoveTo", [targetPos, targetPos + directionVector], vis.colors.yellowHalf);
		if (endSpeed != undefined && endSpeed.length() > 0.001) {
			vis.addPath("MoveTo", [targetPos, targetPos + endSpeed], vis.colors.whiteHalf);
		}

		PathHelper.insertObstacles(this._robot as FriendlyRobot);

		// insert default values
		if (Referee.isSlowDriveState()) {
			maxSpeed = Math.min(maxSpeed, (World.IsLargeField ? Constants.stopSpeed : 1) - 0.25);
		}

		targetPos = Coordinates.toGlobal(targetPos);
		endSpeed = Coordinates.toGlobal(endSpeed);
		targetDir = Coordinates.toGlobal(targetDir);
		let robotPos = Coordinates.toGlobal(this._robot.pos);
		let robotSpeed = Coordinates.toGlobal(this._robot.speed);
		let robotDir = Coordinates.toGlobal(this._robot.dir);

		const TRAJECTORY_PATH_DEBUG = true;

		// find position and speed on last path
		let startPos = robotPos;
		let startSpeed = robotSpeed;
		let futureStartPos = robotPos;
		let futureStartSpeed = robotSpeed;
		let usePositionControl = this.lastTrajectory.length > 0 && !World.IsSimulated;
		if (usePositionControl) {
			let [testPos, testSpeed] = TrajectoryPath.calculateClosestPoint(robotPos, robotSpeed, this.lastTrajectory, 0);
			vis.addCircle("trajectory-closest", Coordinates.toLocal(testPos), 0.03, vis.colors.red);
			if (testPos.distanceTo(robotPos) < 0.1 && testSpeed.distanceTo(robotSpeed) < 0.3) {
				startPos = testPos;
				startSpeed = testSpeed;
				[futureStartPos, futureStartSpeed] = TrajectoryPath.calculateClosestPoint(robotPos, robotSpeed, this.lastTrajectory, 0.01);
			} else {
				this.speedPID.reset();
				this.positionPID.reset();
			}
		}

		// correct start and end speed
		if (startSpeed.length() > maxSpeed - 0.1) {
			startSpeed.setLength(maxSpeed - 0.1);
		}
		if (endSpeed.length() > maxSpeed - 0.1) {
			endSpeed.setLength(maxSpeed - 0.1);
		}

		// calculate acceleration (also used for braking)
		let baseAcceleration = Math.min(Math.abs(this._robot.acceleration.aSpeedupFMax), Math.abs(this._robot.acceleration.aBrakeFMax));
		let accelerate = baseAcceleration * accelScale;

		// call C++ path finding
		let trajectory = this._robot.path.getTrajectory(startPos, startSpeed, targetPos, endSpeed,
			maxSpeed, accelerate);
		if (TRAJECTORY_PATH_DEBUG) {
			let pathColor = trajectory.length < 50 ? vis.colors.green : vis.colors.yellow;
			if (TrajectoryPath.endPos(robotPos, trajectory).distanceTo(targetPos) > 0.005) {
				// orange path if target can't be reached
				pathColor = vis.colors.orange;
			}
			TrajectoryPath.visualizeTrajectory(trajectory, pathColor);
		}
		this.lastTrajectory = trajectory;

		// generate trajectory to reach path finding result

		// calculate rotation
		let rotationExponentialTime = 0.1;
		let rotationAccelerationFactor = 1;

		let rotAccelerate = Math.abs(this._robot.acceleration
			? this._robot.acceleration.aSpeedupPhiMax : 1.0) * rotationAccelerationFactor;
		let rotBrake = -Math.abs(this._robot.acceleration
			? this._robot.acceleration.aBrakePhiMax : 1.0) * rotationAccelerationFactor;
		let rotMaxSpeed = this._robot.maxAngularSpeed;
		let [angularSpeed, angularAccel] = this.rotationCalculation.calculateRotationHysteresis(robotDir,
			this._robot.angularSpeed, targetDir, rotAccelerate, rotBrake, rotMaxSpeed, rotationExponentialTime);

		// finish and return trajectory
		let queryTime = 0.001;
		if (robotPos.distanceTo(targetPos) < 0.1) {
			queryTime = 0.1;
		}
		let speed = TrajectoryPath.speedAtTime(queryTime, trajectory);
		let acc = TrajectoryPath.accAtTime(queryTime, trajectory);

		if (usePositionControl) {
			let posDiff = this.positionPID.update(futureStartPos - robotPos);
			let speedDiff = this.speedPID.update(futureStartSpeed - robotSpeed);
			speed += posDiff;
			speed += speedDiff;
			vis.addPathRaw("Position Control", [robotPos, robotPos + posDiff + speedDiff], vis.colors.red);
		}

		let spline = [ {t_start: 0, t_end: Infinity,
			x: { a0: robotPos.x, a1: speed.x, a2: acc.x / 2, a3: 0 },
			y: { a0: robotPos.y, a1: speed.y, a2: acc.y / 2, a3: 0 },
			phi: { a0: robotDir, a1: angularSpeed, a2: angularAccel / 2, a3: 0 }
		} ];

		return [{spline: spline}, Coordinates.toLocal(targetPos), TrajectoryPath.trajectoryTime(trajectory)];
	}

	private static trajectoryTime(trajectory: Trajectory) {
		if (trajectory.length === 0) {
			return 0;
		}
		return trajectory[trajectory.length - 1].time;
	}

	private static endPos(robotPos: Position, trajectory: Trajectory) {
		if (trajectory.length === 0) {
			return robotPos;
		}
		return trajectory[trajectory.length - 1].pos;
	}

	private static plotSpeed(trajectory: Trajectory) {
		let points = [];
		for (let i = 0;i < trajectory.length;i++) {
			let pos = new Vector(trajectory[i].speed.length(), trajectory[i].time);
			points.push(Coordinates.toLocal(pos));
		}
		vis.addPath("trajectory-speeds", points, vis.colors.blue);
		for (let i = 0;i < 5;i++) {
			vis.addPath("trajectory-speeds", [Coordinates.toLocal(new Vector(i, 0)),
						Coordinates.toLocal(new Vector(i, 5))], vis.colors.red);
		}
	}

	private static speedAtTime(time: number, trajectory: Trajectory): Speed {
		for (let i = 0;i < trajectory.length - 1;i++) {
			let next = trajectory[i + 1];
			if (next.time > time) {
				let current = trajectory[i];
				let tFactor = (time - current.time) / (next.time - current.time);
				let v = current.speed + tFactor * (next.speed - current.speed);
				return v;
			}
		}
		if (trajectory.length > 0) {
			return trajectory[trajectory.length - 1].speed;
		}
		return new Vector(0, 0);
	}

	private static posAtTime(time: number, trajectory: Trajectory): Position {
		if (trajectory.length === 0) {
			return new Vector(0, 0);
		}
		for (let i = 0;i < trajectory.length - 1;i++) {
			let next = trajectory[i + 1];
			if (next.time > time) {
				let current = trajectory[i];
				let tFactor = (time - current.time) / (next.time - current.time);
				let v = current.speed + tFactor * (next.speed - current.speed);

				return current.pos + (current.speed + v) * 0.5 * (time - current.time);
			}
		}
		if (trajectory.length > 0) {
			return trajectory[trajectory.length - 1].pos;
		}
		return new Vector(0, 0);
	}

	private static accAtTime(time: number, trajectory: Trajectory): Vector {
		for (let i = 0;i < trajectory.length - 1;i++) {
			let next = trajectory[i + 1];
			if (next.time > time) {
				let current = trajectory[i];
				let acc = (next.speed - current.speed) / (next.time - current.time);
				return acc;
			}
		}
		return new Vector(0, 0);
	}

	private static visualizeTrajectory(trajectory: Trajectory, color: any) {
		let positions: Position[] = [];
		for (let part of trajectory) {
			positions.push(Coordinates.toLocal(part.pos));
		}
		vis.addPath("trajectory-fromC++", positions, color);
	}

	private static calculateClosestPoint(position: Position, speed: Speed, trajectory: Trajectory, offset: number) {
		let bestPos = position, bestSpeed = speed;
		let bestTime = Infinity;
		let bestDistance = Infinity;
		for (let i = 0;i < 50;i++) {
			let time = i / 1000;
			let pos = TrajectoryPath.posAtTime(time, trajectory);
			let speed = TrajectoryPath.speedAtTime(time, trajectory);

			if (pos.distanceTo(position) < bestDistance) {
				bestDistance = pos.distanceTo(position);
				bestPos = pos;
				bestSpeed = speed;
				bestTime = time;
			}
		}
		bestPos = TrajectoryPath.posAtTime(bestTime + offset, trajectory);
		bestSpeed = TrajectoryPath.speedAtTime(bestTime + offset, trajectory);
		return [bestPos, bestSpeed];
	}

	private static polynomialAtOffset(a0: number, a1: number, a2: number, offset: number): [number, number, number] {
		// TODO: offset polynomial
		return [a0, a1, a2];
	}
}
