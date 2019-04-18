import { Coordinates } from "base/coordinates";
import * as debug from "base/debug";
import { TrajectoryHandler, TrajectoryResult } from "base/trajectory";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";

import { DirectRotation } from "glados/trajectory/directrotation";

type Trajectory = { pos: Position, speed: Speed, time: number}[];

export class TrajectoryPath extends TrajectoryHandler {
	private rotationCalculation: DirectRotation = new DirectRotation();

	private lastTrajectory: Trajectory = [];

	public canHandle(...args: any[]): boolean {
		return true;
	}

	public update(...args: [Position, number, number, Speed, number, boolean]): TrajectoryResult {
		return this._update(args[0], args[1], args[2], args[3]);
	}

	private _update(targetPos: Position, targetDir: number, maxSpeed: number = this._robot.maxSpeed,
			endSpeed: Speed = new Vector(0, 0)): TrajectoryResult {

		targetPos = Coordinates.toGlobal(targetPos);
		endSpeed = Coordinates.toGlobal(endSpeed);
		let robotPos = Coordinates.toGlobal(this._robot.pos);
		let robotSpeed = Coordinates.toGlobal(this._robot.speed);
		let robotDir = Coordinates.toGlobal(this._robot.dir);

		const TRAJECTORY_PATH_DEBUG = true;

		// find position and speed on last path
		let startPos = robotPos;
		let startSpeed = robotSpeed;
		if (this.lastTrajectory.length > 0) {
			let [testPos, testSpeed] = TrajectoryPath.calculateClosestPoint(robotPos, robotSpeed, this.lastTrajectory);
			// TrajectoryPath.visualizeTrajectory(this.lastTrajectory, vis.colors.green);
			vis.addCircle("trajectory-closest", Coordinates.toLocal(testPos), 0.03, vis.colors.red);
			if (testPos.distanceTo(robotPos) < 0.2) {
				// startPos = testPos;
				// startSpeed = robotSpeed;
			}
		}

		// correct start and end speed
		if (startSpeed.length() > maxSpeed - 0.1) {
			startSpeed.setLength(maxSpeed - 0.1);
			// amun.log("ist " + (maxSpeed - 0.1) + " und " + startSpeed.length());
		}
		if (endSpeed.length() > maxSpeed - 0.1) {
			endSpeed.setLength(maxSpeed - 0.1);
		}

		// call C++ path finding
		let trajectory = this._robot.path.getTrajectory(startPos, startSpeed, targetPos, endSpeed,
			maxSpeed);
		if (TRAJECTORY_PATH_DEBUG) {
			TrajectoryPath.visualizeTrajectory(trajectory, vis.colors.orange);
			// TrajectoryPath.plotSpeed(trajectory);
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
		let speed = TrajectoryPath.speedAtTime(0.12, trajectory);
		// amun.log("Ist: " + speed.length());
		let acc = TrajectoryPath.accAtTime(0.12, trajectory);
		let spline = [ {t_start: 0, t_end: Infinity,
			x: { a0: robotPos.x, a1: speed.x, a2: acc.x / 2, a3: 0 },
			y: { a0: robotPos.y, a1: speed.y, a2: acc.y / 2, a3: 0 },
			phi: { a0: robotDir, a1: angularSpeed, a2: angularAccel / 2, a3: 0 }
		} ];
		let time = 0;
		for (let point of trajectory) {
			// spline.push({});
		}

		// let endTime = speedProfile[speedProfile.length - 1][1];
		return [{spline: spline}, Coordinates.toLocal(targetPos), 0];
		// return [{spline: []}, Coordinates.toLocal(targetPos), 0];
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

	private static calculateClosestPoint(position: Position, speed: Speed, trajectory: Trajectory) {
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
		// bestSpeed = TrajectoryPath.speedAtTime(bestTime + 0.01, trajectory);
		return [bestPos, bestSpeed];
	}

	private static polynomialAtOffset(a0: number, a1: number, a2: number, offset: number): [number, number, number] {
		// TODO: offset polynomial
		return [a0, a1, a2];
	}
}
