import * as debug from "base/debug";
import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { Robot as OpponentRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as ObserverShoot from "glados/observer/shoot";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as Interval from "glados/util/interval";
import * as Rating from "glados/util/rating";
import * as ShootGoalUtil from "glados/util/shootgoal";

const G = World.Geometry;


export class ShootGoal extends Task {
	private _shootTargetPoint: Position | undefined = undefined;
	private _shootTargetWidth: number = 0;
	private _dirty: boolean = false;
	private _desperate: boolean;
	private _desperateTargetPoint: Position | undefined = undefined;
	private _desperateTargetID: number | undefined = undefined;

	private _ballReceiptPos: Position | undefined;
	private _lastReceivesPassTime: number = 0;
	private alreadyTouchedBall: boolean = false;
	private isFirstFrame: boolean = true;
	private _forceFast: boolean;

	// last frames shoot information
	private lastWasChip: boolean = false;
	private lastMode: string = "";
	private lastShootInfo: [Position, number, number?, Position?, number?] | undefined;
	private lastChipInfo: [Position, Position?, undefined?, number?, number?] | undefined;
	private localTarget: Position | undefined;

	private _shoot: Shoot;

	private _hitCorners: boolean;

	constructor(behavior: Behavior, ballReceiptPos?: Position, forceDesperate = false, forceFast = false, hitCorners = false) {
		super(behavior);
		this._desperate = forceDesperate;

		this._ballReceiptPos = ballReceiptPos;
		this._forceFast = forceFast;

		this._shoot = new Shoot(this);

		this._hitCorners = hitCorners;
	}

	private _lockTarget(ballReceiptPos?: Position): boolean {
		if (this._shootTargetPoint == undefined) {
			return false;
		}

		if (this._forceFast) {
			return true;
		}

		if (Ball.receivesPass(this._robot)) {
			if (ballReceiptPos && Physics.checkedBallRollTime(World.Ball, ballReceiptPos) < 0.5) {
				return true;
			} else {
				return false;
			}
		}

		if (Robot.isPressed(this._robot)) {
			return true;
		}

		return false;
	}

	private _drawDebugInfo(target: Position, locked: boolean) {
		let color;
		let mode = this.lastMode;
		if (this._desperate) {
			mode = mode || "desperate unspecified";
			color = vis.colors.redHalf;
		} else {
			if (this._dirty) {
				mode = "dirty";
				color = vis.colors.orangeHalf;
			} else {
				mode = "clean";
				color = vis.colors.yellowHalf;
			}
		}

		if (locked) {
			mode = `${mode} (locked)`;
		}

		debug.set("mode", mode);
		debug.set("target", target);
		vis.addCircle("t/shootgoal: target", target, 0.05, color, true);
	}

	// although DoubleTouchGuard will prevent a double touch in many cases,
	// it can not prevent the case that we try to shoot, redecide after already touching the ball
	// and then try to shoot again while crossing the 5cm radius while touching the ball
	private canRedecide(): boolean {
		let firstFrame = this.isFirstFrame;
		this.isFirstFrame = false;
		if (firstFrame) {
			return true;
		}
		if (Referee.isFriendlyFreeKickState() || Referee.isFriendlyKickoffState()) {
			if (this._robot.hasBall(World.Ball, undefined, 0)) {
				this.alreadyTouchedBall = true;
			}
			const MAX_TIMEFRAME = Referee.isFriendlyFreeKickState() ? 4.3 : 8.5; // has to be larger than freekick::MAX_TIMEFRAME
			let timeRunningOut = World.Time - Referee.lastStateChangeTime() >= MAX_TIMEFRAME;
			return !this.alreadyTouchedBall && !timeRunningOut;
		}
		return true;
	}

	run() {
		const obstacleTable = {
			task: this,
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		if (!this.canRedecide()) {
			// use decision from last frame
			this.executeDecision(true);
			return;
		}

		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition, true)[1];

		let ballReceiptPos = this._ballReceiptPos || attackPosition;

		if (!this._lockTarget(ballReceiptPos)) {
			[this._shootTargetPoint, this._shootTargetWidth, this._dirty] =
				ShootGoalUtil.updateTarget(this._robot, this._shootTargetPoint, this._dirty, attackPosition);
		}

		// aim at the center of the goal when shooting from too far away
		let maxDistance = 0.75 * G.FieldHeight;
		let minDistance = 0.25 * G.FieldHeight;
		let distance = this._robot.pos.distanceTo(this._shootTargetPoint!);
		// TODO fix volley model
		const limitCorners = this._hitCorners ? 1 : (2 / 3);
		let localTargetX = (Rating.valueToRating(distance, maxDistance, minDistance) * limitCorners) * this._shootTargetPoint!.x;
		this.localTarget = new Vector(localTargetX, this._shootTargetPoint!.y);

		if (!this._desperate) {
			this._desperate = this._shootTargetWidth < 0.5 * Math.PI / 180;
		}

		let receivesPass = Ball.receivesPass(this._robot);
		debug.set("receivesPass", receivesPass);
		if (receivesPass) {
			this._lastReceivesPassTime = World.Time;
		}

		let linearOverride = World.Time - this._lastReceivesPassTime < 0.1 && ObserverShoot.volleyPossible(this._robot, this.localTarget);
		debug.set("linearOverride", linearOverride);

		if (!this._desperate) {
			// perform a linear shot
			let targetWidth = this._shootTargetWidth != undefined ? this._shootTargetWidth : Infinity;
			this.lastWasChip = false;
			this.lastShootInfo = [this.localTarget, Infinity, undefined, ballReceiptPos, Math.min(10 * Math.PI / 180, targetWidth)];
		} else {
			let maxAngleError = 10 * Math.PI / 180;
			// prevent icing
			if (World.Ball.pos.y < 0) {
				maxAngleError = 2 * Math.PI / 180;
			}

			if (Referee.isFriendlyFreeKickState() || World.RefereeState === "KickoffOffensive") {
				maxAngleError = 0.5 * Math.PI / 180;
			}

			ballReceiptPos = ballReceiptPos || World.Ball.pos;
			debug.set("ballReceiptPos", ballReceiptPos);

			let onlyOppOcc = [];
			let disabled = true; // FIXME after solving TODO
			this.localTarget = undefined;

			if (!disabled) {

				let occupied = Goal.getOccupiedSectors(ballReceiptPos, World.OpponentRobots,  0, Math.PI, true); // TODO extrapolate them
				Interval.sort(occupied);
				Interval.merge(occupied);

				let bothOcc = Goal.getOccupiedSectors(ballReceiptPos, World.Robots, 0, Math.PI, true); // TODO extrapolate them
				Interval.sort(bothOcc);
				Interval.merge(bothOcc);

				let bothCnt = 1;
				let occCnt = 1;
				while (true) {
					if (occCnt > occupied.length || bothCnt > bothOcc.length) {
						break;
					}
					let intervalB = bothOcc[bothCnt];
					let intervalE = occupied[occCnt];
					// floatEq is correct here
					if (intervalB[0] === intervalE[0] && intervalB[1] === intervalE[1]) {
						onlyOppOcc.push(intervalB);
						occCnt = occCnt + 1;
						bothCnt = bothCnt + 1;
					} else if (intervalB[0] < intervalE[0]) {
						bothCnt = bothCnt + 1;
					} else {
						occCnt = occCnt + 1;
					}
				}
			}

			if (onlyOppOcc.length <= 0) {
				this._desperateTargetID = undefined;
			}

			if (onlyOppOcc.length > 0 && this._desperateTargetPoint == undefined) {
				const EPSILON = 0.0001;
				// state: desperate clean
				do {
					let selectedInterval = undefined;
					if (this._desperateTargetID != undefined) {
						// try to continue shooting at the same bot
						// TODO: don't pretend its always going to be that side
						for (let v of onlyOppOcc) {
							if ((v[2] as OpponentRobot[])[0].id === this._desperateTargetID) {
								selectedInterval = v;
								break;
							}
						}
					}
					if (selectedInterval == undefined) {
						this._desperateTargetID = undefined;
						// TODO: Use heuristic instead of random
						selectedInterval = onlyOppOcc[MathUtil.randomInt([1, onlyOppOcc.length])];
					}
					let selectedDir = selectedInterval[0] + 1 / 2 * (((selectedInterval[2] as OpponentRobot[])[0].pos - ballReceiptPos).angle() - selectedInterval[0]); // TODO: select side
					let angleError = selectedDir - selectedInterval[1];
					let avoidIcing = ballReceiptPos.y < 0.3;
					if (avoidIcing) {
						let lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir + angleError));
						if (lineCut && Math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON) {
							onlyOppOcc.splice(onlyOppOcc.indexOf(selectedInterval), 1);
							continue;
						}
						lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir - angleError));
						if (lineCut && Math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON) {
							onlyOppOcc.splice(onlyOppOcc.indexOf(selectedInterval), 1);
							continue;
						}
					}

					this._desperateTargetID = (selectedInterval[2] as OpponentRobot[])[0].id;
					this.localTarget = Vector.fromAngle(selectedDir) + ballReceiptPos;
					this.lastMode = "desperate clean";
					this.lastWasChip = false;
					this.lastShootInfo = [this.localTarget, Infinity, undefined, ballReceiptPos, angleError];
				} while (this._desperateTargetID == undefined && onlyOppOcc.length === 0);
			}
			if ((ballReceiptPos.y < (this._desperateTargetPoint ? 0.5 : 0)) && !linearOverride && this._desperateTargetID == undefined) {
				this.lastMode = "desperate chip";
				this.localTarget = new Vector(0, (G.FieldHeightHalf + this._robot.pos.y) / 2);
				this.lastWasChip = true;
				this.lastChipInfo = [this.localTarget, ballReceiptPos, undefined, maxAngleError, 0.5];
				this._desperateTargetPoint = this.localTarget;
			} else {
				this._desperateTargetPoint = undefined;
			}
			if (this.localTarget == undefined) {
				this.lastMode = "desperate desperate";
				// state: desperate desperate
				// shoot at the center of the opponent goal
				this.localTarget = new Vector(0, G.FieldHeightHalf);
				this.lastWasChip = false;
				this.lastShootInfo = [this.localTarget, Infinity, undefined, ballReceiptPos, maxAngleError];
			}
		}
		this.executeDecision(false);
	}

	private executeDecision(locked: boolean) {
		this._drawDebugInfo(this.localTarget!, locked);
		if (this.lastWasChip) {
			this._shoot._chipPass(...this.lastChipInfo!);
		} else {
			this._shoot._shoot(...this.lastShootInfo!);
		}
	}
}
