import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as World from "base/world";

export class DirectRotation {
	private lastTargetDir: number | undefined;
	private lastTime: number | undefined;

	public calculateRotationHysteresis(robotDir: number, currentOmega: number, targetDir: number, rotAccel: number, rotBrake: number,
			rotSpeed: number, rotExpTime: number): [number, number] {
		// feedforward of target direction change
		// as tracking a direction only works if it changes slow enough, using feedforwad shouldn't cause any trouble
		// TODO: only add a reasonable directionChange, not a million
		// FIXME?: Assuming the direction change will keep on going, we can still calculate if it will be faster to do the piruette, or to break and return and break again and accelerate again. TODO: Is that even what we want? At some point the dir change will stop and then we have to break our speed again.
		const feedforwardSpeed: number = this.lastTime == undefined ? 0 : geom.normalizeAngle(targetDir - this.lastTargetDir!) / (World.Time - this.lastTime);
		let [angularSpeed, angularAccel] = DirectRotation.calculateRotation(robotDir, currentOmega, targetDir,
		rotAccel, rotBrake, rotSpeed, rotExpTime, feedforwardSpeed);
		this.lastTargetDir = targetDir;
		this.lastTime = World.Time;
		return [angularSpeed, angularAccel];
	}

	private static calculateRotation(currentDir: number, currentOmegaParam: number, targetDir: number,
			accelerate: number, brake: number, maxSpeed: number, exponentialTime: number, feedforwardSpeed: number): [number, number] {
		let currentOmega = currentOmegaParam - feedforwardSpeed;
		let fullBrakeTime = Math.abs(currentOmega / brake);
		// how far the robot will rotate even if it brakes with maximum speed
		let forcedRotation = MathUtil.sign(currentOmega) * -brake * fullBrakeTime * fullBrakeTime / 2;

		// FIXME assert. (maxSpeed/maxAccel)^2*maxSpeed/2 < Math.PI

		// required direction change
		let dirChange = geom.getAngleDiff(currentDir, targetDir);

		// if the robot is fast enough that rotating with the opposite angle would be faster
		if (Math.abs(dirChange - forcedRotation) >= Math.PI) {
			if (dirChange < 0) {
				dirChange = dirChange + 2 * Math.PI;
			} else {
				dirChange = dirChange - 2 * Math.PI;
			}
		}

		// v(t) = v_0 * e^(-k*t)  <//> v(dist) = k*dist
		// v_0 = expStartSpeed
		// v'(0) = brake -> k = 1/exponentialTime
		let k = 1 / exponentialTime;
		let expStartSpeed = exponentialTime * -brake;
		// integrate v(t) from 0 to +inf
		let expDistance = expStartSpeed * exponentialTime;

		let outSpeed;
		let outAccel;

		if (Math.abs(dirChange) <= expDistance) {
			// exponential part
			outSpeed = MathUtil.bound(-maxSpeed, dirChange * k, maxSpeed);
			outAccel = 0; // FIXME
		} else if (MathUtil.sign(currentOmega) !== MathUtil.sign(dirChange)) {
			// robot rotates into the wrong direciton
			outSpeed = currentOmega;
			outAccel = MathUtil.sign(dirChange) * -brake;
		} else if (Math.abs(currentOmega) <= expStartSpeed) {
			// robot is slower that the exponential start speed
			outSpeed = currentOmega;
			outAccel = MathUtil.sign(dirChange) * accelerate;
			if (Math.abs(outSpeed) > maxSpeed) {
				outAccel = 0;
			}
		} else {
			// check whether the robot should brake yet or keep accelerating
			let brakeTime = (Math.abs(currentOmega) - expStartSpeed) / -brake;
			let brakeDist = expDistance + -brake * brakeTime * brakeTime / 2 + expStartSpeed * brakeTime;

			if (Math.abs(dirChange) <= brakeDist) {
				let remainingBrakeTime = MathUtil.solveSq(-brake / 2, expStartSpeed, expDistance - brakeDist)[0];
				if (remainingBrakeTime == undefined || remainingBrakeTime < 0) {
					throw new Error("");
				}
				outSpeed = MathUtil.sign(dirChange) * (expStartSpeed + remainingBrakeTime * -brake);
				outAccel = MathUtil.sign(dirChange) * brake;
			} else {
				// speed-up
				let targetSpeed = Math.abs(currentOmega);
				outAccel = MathUtil.sign(dirChange) * accelerate;
				// limit to maxSpeed
				if (targetSpeed >= maxSpeed) {
					targetSpeed = maxSpeed;
					outAccel = 0;
				}
				outSpeed = targetSpeed * MathUtil.sign(dirChange);
			}
		}

		outSpeed += feedforwardSpeed;

		return [outSpeed, outAccel];
	}
}
