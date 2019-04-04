import { Coordinates } from "base/coordinates";
import { TrajectoryHandler, TrajectoryResult } from "base/trajectory";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";

import { DirectRotation } from "glados/trajectory/directrotation";

export class TrajectoryPath extends TrajectoryHandler {
	private rotationCalculation: DirectRotation = new DirectRotation();

	public canHandle(...args: any[]): boolean {
		return true;
	}

	public update(...args: [Position, number, number, Speed, number, boolean]): TrajectoryResult {
		return this._update(args[0], args[1], args[2], args[3]);
	}

	private _update(targetPos: Position, targetDir: number, maxSpeed: number = this._robot.maxSpeed,
			endSpeed: Speed = new Vector(0, 0)): TrajectoryResult {

		targetPos = Coordinates.toGlobal(targetPos);
		let robotPos = Coordinates.toGlobal(this._robot.pos);
		let robotSpeed = Coordinates.toGlobal(this._robot.speed);
		let robotDir = Coordinates.toGlobal(this._robot.dir);

		const TRAJECTORY_PATH_DEBUG = true;

		// find position and speed on last path
		let startPos = robotPos;
		let startSpeed = robotSpeed;

		// call C++ path finding
		let trajectory = this._robot.path.getTrajectory(startPos, startSpeed, targetPos, endSpeed,
			this._robot.maxSpeed);
		if (TRAJECTORY_PATH_DEBUG) {
			TrajectoryPath.visualizeTrajectory(trajectory);
		}

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
		let speed = TrajectoryPath.speedAtTime(0.005, trajectory);
		let acc = TrajectoryPath.accAtTime(0.005, trajectory);
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

	private static speedAtTime(time: number, trajectory: { pos: Position, speed: Speed, time: number}[]): Speed {
		for (let i = 0;i < trajectory.length;i++) {
			let next = trajectory[i + 1];
			if (next.time > time) {
				let current = trajectory[i];
				let tFactor = (time - current.time) / (next.time - current.time);
				let v = current.speed + tFactor * (next.speed - current.speed);
				return v;
			}
		}
		return trajectory[trajectory.length - 1].speed;
	}

	private static accAtTime(time: number, trajectory: { pos: Position, speed: Speed, time: number}[]): Vector {
		for (let i = 0;i < trajectory.length;i++) {
			let next = trajectory[i + 1];
			if (next.time > time) {
				let current = trajectory[i];
				let acc = (next.speed - current.speed) / (next.time - current.time);
				return acc;
			}
		}
		return new Vector(0, 0);
	}

	private static visualizeTrajectory(trajectory: { pos: Position, speed: Speed, time: number}[]) {
		let positions: Position[] = [];
		for (let part of trajectory) {
			positions.push(Coordinates.toLocal(part.pos));
		}
		vis.addPath("trajectory-fromC++", positions, vis.colors.orange);
	}

	private static polynomialAtOffset(a0: number, a1: number, a2: number, offset: number): [number, number, number] {
		// TODO: offset polynomial
		return [a0, a1, a2];
	}
}
