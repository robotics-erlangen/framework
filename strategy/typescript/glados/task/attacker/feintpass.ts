import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Sampling, SupportParameters } from "glados/task/attacker/support";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { TrajectoryPath } from "glados/trajectory/trajectorypath";
import { currentPlannedMainAttacker, PassInfo } from "glados/util/attack";
import { Zone } from "glados/util/zone";

const G = World.Geometry;

const obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: false,
	ignorePass: true,
	ignoreDefenseArea: false,
	ignoreOpponentDefenseArea: false,
};

export class FeintPassTask extends Task {

	public passWasShot: boolean = false;
	public evacuate: boolean = false;
	public complete: boolean = false;

	public relevantPassInfo: PassInfo;
	public passRobot: FriendlyRobot;
	public feintPos: Position;

	private _attackPosition: Position;
	private _zone?: Zone;

	private _reEvaluateTimestamp: number | undefined;
	private _suggestPass: SuggestPass | undefined;
	private _sampling: Sampling | undefined;
	private _passDestSuggestion: Position | undefined;

	public constructor(behavior: Behavior, supportParameters: SupportParameters | undefined, relevantPassInfo: PassInfo,
			passRobot: FriendlyRobot, feintPos: Position, attackPosition: Position) {
		super(behavior);

		this.relevantPassInfo = relevantPassInfo;
		this.passRobot = passRobot;
		this.feintPos = feintPos;
		this._attackPosition = attackPosition;

		if (supportParameters) {
			this._reEvaluateTimestamp = World.Time;
			this._suggestPass = new SuggestPass(this);
			this._sampling = new supportParameters.samplingCtor(this);
		}
		this.updateState(attackPosition);
	}

	// Copied from supportTask for now because it can't be moved to util/attack because it uses internal states
	private _reEvaluatePassDest(): boolean {
		if (this._reEvaluateTimestamp === undefined) {
			throw new Error("FeintPass should not evaluate passDests if it can't do passes");
		}
		let timestamps = this._messaging.receive(MessageType.supportSamplingTimestamp, true);
		let nextCandidate = undefined;
		let nextCandidateTimestamp = Infinity;
		for (let [r, time] of timestamps.entries()) {
			if (nextCandidate == undefined || time < nextCandidateTimestamp
					|| time === nextCandidateTimestamp && r.id < nextCandidate.id) {
				nextCandidate = r;
				nextCandidateTimestamp = time;
			}
		}

		let revaluate = this._robot === nextCandidate;
		if (revaluate) {
			this._reEvaluateTimestamp = World.Time;
		}

		this._messaging.sendBroadcast(MessageType.supportSamplingTimestamp, this._reEvaluateTimestamp);

		return revaluate;
	}

	private _searchForPassDest() {
		if (!this._sampling) {
			throw new Error("FeintPass should not search for passDests if it can't do passes");
		}
		this._sampling.precalculate();

		let grid_point_count_x = 16;
		let grid_point_count_y = 14;

		let grid_point_dist_x = G.FieldWidth / grid_point_count_x;
		let grid_point_dist_y = G.FieldHeight / grid_point_count_y;

		let boundaries = this._zone!.boundaries;
		let left = boundaries.left;
		let right = boundaries.right;
		let top = boundaries.top;
		let bottom = boundaries.bottom;

		// TODO hysteresis
		// TODO only consider well-timed pass positions
		// TODO am strafraum stehen ist geil! -> score anpassen

		let bestPoint = undefined;
		let bestScore = -Infinity;
		for (let x = grid_point_dist_x * 0.5 - G.FieldWidthHalf; x <= G.FieldWidthHalf; x += grid_point_dist_x) {
			if (x <= left || x >= right) {
				continue;
			}

			for (let y = grid_point_dist_y * 0.5 - G.FieldHeightHalf; y <= G.FieldHeightHalf; y += grid_point_dist_y) {
				if (y <= bottom || y >= top || (G.FieldHeightHalf - Math.abs(y) < 4 && Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius))) {
					continue;
				}

				let candidatePoint = new Vector(x, y);
				candidatePoint = Field.limitToAllowedField(candidatePoint, -(3 * this._robot.radius + 0.1));
				if (!geom.insideRect(new Vector(left, bottom), new Vector(right, top), candidatePoint)) {
					continue;
				}

				let score = this._sampling.evalLocation(candidatePoint, bestScore);
				let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
				let firstHysteresis = false;
				if (passInfoTable) {
					for (let passInfo of passInfoTable) {
						if (passInfo.ballPos.distanceToSq(candidatePoint) < 0.01 * 0.01) {
							score = score + 0.1;
							firstHysteresis = true;
						}
					}
				}
				if (!firstHysteresis && this._passDestSuggestion &&
						this._passDestSuggestion.distanceToSq(candidatePoint) < 0.01 * 0.01) {
					score += 0.05;
				}
				if (score > bestScore) {
					bestScore = score;
					bestPoint = candidatePoint;
				}
			}
		}

		this._passDestSuggestion = bestPoint;
	}

	public updatePass(relevantPassInfo: PassInfo, feintPos: Position, attackPosition: Position): void {
		this.relevantPassInfo = relevantPassInfo;
		this.feintPos = feintPos;
		this._attackPosition = attackPosition;
	}

	public run(): void {
		let groupName: "dummy" | "support" = this._suggestPass ? "support" : "dummy";
		this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: groupName });

		// retrieve the assigned zone from the support group
		let zoneType = this._suggestPass ? MessageType.supportZone : MessageType.dummyZone;
		this._zone = this._messaging.receiveTrainer(zoneType);
		if (this._zone == undefined) {
			return;
		}

		// search for a good pass dest
		if (this._suggestPass && (this._reEvaluatePassDest() || !this._passDestSuggestion)) {
			this._searchForPassDest();
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let color = this.evacuate ? vis.colors.green : vis.colors.red;
		vis.addCircle("t/a/feintpass: evacuate", this._robot.pos, 0.05, color, true);
		debug.set("FeintpassTask/passWasShot", this.passWasShot);
		debug.set("FeintpassTask/evacuate", this.evacuate);
		debug.set("FeintpassTask/completed", this.complete);
		debug.set("FeintpassTask/passRobot", this.passRobot.id);

		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
		if (this._passDestSuggestion && attackPosition && this._suggestPass) {
			this._suggestPass.suggestPass(this._passDestSuggestion, attackPosition,
				Physics.robotTimeToPos(this._robot, this._passDestSuggestion, new Vector(0, 0))[0]);
		}

		let path = this._robot.path;

		if (this.evacuate) {
			if (this.passWasShot) {
				if (attackPosition) {
					// Feinted pass is already shot --> new attackPosition is where the ball will be catched
					path.addLine(World.Ball.pos, attackPosition, this._robot.radius, "PassEvacuation", 1);
				} else {
					path.addLine(World.Ball.pos, this.relevantPassInfo.ballPos, this._robot.radius, "PassEvacuation", 1);
				}
			} else {
				if (attackPosition) {
					path.addLine(attackPosition, this.relevantPassInfo.ballPos, this._robot.radius, "PassEvacuation", 1);
				} else {
					// This case should probably never happen tm
					path.addLine(World.Ball.pos, this.relevantPassInfo.ballPos, this._robot.radius, "PassEvacuation", 1);
				}
			}
		}

		// We want to look at the ball so we can quickly stop it in case the behavior changes and feintpass dies
		// But we do not want to rotate if we evacuate because evacuating while rotating is slow
		let targetDir = this.evacuate ? this._robot.dir : (World.Ball.pos - this.feintPos).angle();

		this._robot.trajectory.update(TrajectoryPath, this.feintPos, targetDir);
	}

	public updateState(attackPosition: Position): void {
		let plannedAttackTime = this._messaging.receiveSingleSender(MessageType.plannedAttackTime)[1];
		let [sender, passInfoTable] = this._messaging.receiveSingleSender(MessageType.passInfo);

		let futureShotBall = { pos: attackPosition,
			speed: (this.relevantPassInfo.ballPos - this._attackPosition).withLength(this.relevantPassInfo.passSpeed),
			maxSpeed: this.relevantPassInfo.passSpeed,
			radius: World.Ball.radius, posZ: 0
		} as Physics.BallLike;

		if ((Robot.hadBall(this.passRobot, 0.3) && Ball.wasShot(0.1)) || (
			passInfoTable !== undefined && ((currentPlannedMainAttacker(sender, passInfoTable) === this.relevantPassInfo.target
			&& this.relevantPassInfo.target !== undefined) || sender === this.relevantPassInfo.target)
		)) {
			this.passWasShot = true;
		}

		let ballTime = this.passWasShot
			? Physics.ballRollTime(World.Ball, World.Ball.pos.distanceTo(this.feintPos))
			: Physics.ballRollTime(futureShotBall, futureShotBall.pos.distanceTo(this.feintPos));

		let triggerEvacuate = false;

		let orthoProjection = this._robot.pos.orthogonalProjection(attackPosition, this.relevantPassInfo.ballPos)[0];
		let dummyEvacuatePos = orthoProjection - (this._robot.pos - orthoProjection).withLength(2 * this._robot.radius);
		vis.addCircle("t/a/feintpass: dummyEvacuatePos", dummyEvacuatePos, 0.05, vis.colors.red, true);
		let robotTime = Physics.robotTimeToPos(this._robot, dummyEvacuatePos, new Vector(0, 0))[0];

		debug.set("FeintpassTask/robotTime", robotTime);
		debug.set("FeintpassTask/ballTime", ballTime);
		if (plannedAttackTime !== undefined) {
			debug.set("FeintpassTask/plannedAttackTime", plannedAttackTime - World.Time);
		}

		if (this.passWasShot || this.evacuate || (
			!Ball.isStanding()
			&& Math.abs(World.Ball.speed.angleDiff(this.relevantPassInfo.ballPos - this._attackPosition)) < (Math.PI / 180) * 10
			&& Math.abs((World.Ball.pos - this._attackPosition).angleDiff(this.relevantPassInfo.ballPos - this._attackPosition)) < (Math.PI / 180) * 10
		)) {
			if (ballTime < robotTime) {
				triggerEvacuate = true;
			}
		} else {
			if (plannedAttackTime !== undefined && ballTime + plannedAttackTime < World.Time + robotTime) {
				triggerEvacuate = true;
			}
		}

		if (triggerEvacuate) {
			this.evacuate = true;
		}

		// feintpass task is completed if and only if:
		// - the ball owner changed
		// - the pass was shot
		// - the ball was interrupted by any robot, so either accepted or redirected
		if (Ball.lastBallOwner() !== this.passRobot && this.passWasShot && Ball.interruped()) {
			this.complete = true;
		}
	}
}
