import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import { StrikerSampling } from "glados/task/ability/strikersampling";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as Attack from "glados/util/attack";
import * as UtilDefense from "glados/util/defense";

const G = World.Geometry;

export class Striker extends Task {
	private _manualDefaultPos: Position | undefined;
	private _manualPassDest: Position | undefined;
	private _passDestSuggestion: Position | undefined;

	private _moveDest: Position | undefined = undefined;
	private _zone: {defaultPos: Position, boundaries: {left: number, right: number, top: number, bottom: number}} | undefined = undefined;
	private _reEvaluateTimestamp: number = 0;

	private _obstacleTable: PathHelper.PathHelperParameters;

	private _suggestPass: SuggestPass;
	private _strikerSampling: StrikerSampling;

	constructor(agent: Agent, manualDefaultPos?: Position, manualPassDest?: Position) {
		super(agent);
		this._manualDefaultPos = manualDefaultPos;
		this._manualPassDest = manualPassDest;
		this._passDestSuggestion = manualPassDest;

		this._obstacleTable  = {
			ignoreBall: false,
			messaging: this._messaging
		};

		this._suggestPass = new SuggestPass(this._robot, this._messaging);
		this._strikerSampling = new StrikerSampling(this._robot, this._messaging);
	}

	private _reEvaluatePassDest(): boolean {
		if (this._manualPassDest != undefined) {
			return false;
		}

		if (this._passDestSuggestion == undefined) {
			return true;
		}

		let timestamps = this._messaging.receive(MessageType.strikerSamplingTimestamp, true);
		let nextCandidate = undefined;
		let nextCandidateTimestamp = Infinity;
		for (let [r, time] of timestamps.entries()) {
			if (nextCandidate == undefined || time < nextCandidateTimestamp
					||  time === nextCandidateTimestamp && r.id < nextCandidate.id) {
				nextCandidate = r;
				nextCandidateTimestamp = time;
			}
		}

		let revaluate = this._robot === nextCandidate;
		if (revaluate) {
			this._reEvaluateTimestamp = World.Time;
		}

		this._messaging.sendBroadcast(MessageType.strikerSamplingTimestamp, this._reEvaluateTimestamp);

		return revaluate;
	}

	private _searchForPassDest() {
		this._strikerSampling.precalculate();

		let grid_point_count_x = 6;
		let grid_point_count_y = 10;

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
		for (let x = grid_point_dist_x * 0.5 - G.FieldWidthHalf;x <= G.FieldWidthHalf; x += grid_point_dist_x) {
			if (x > left && x < right) {
				for (let y = grid_point_dist_y * 0.5 - G.FieldHeightHalf; y <= G.FieldHeightHalf; y += grid_point_dist_y) {
					if (y > bottom && y < top) {
						let candidatePoint = new Vector(x, y);
						candidatePoint = Field.limitToAllowedField(candidatePoint, 3 * this._robot.radius + 0.1);
						if (geom.insideRect(new Vector(left, bottom), new Vector(right, top), candidatePoint)) {
							let score = this._strikerSampling.evalLocation(candidatePoint, bestScore);
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
				}
			}
		}

		this._passDestSuggestion = bestPoint;
	}

	public run() {
		this._messaging.sendBroadcast(MessageType.strikerFlag);

		if (this._manualDefaultPos) {
			this._moveDest = this._manualDefaultPos;
		} else {
			// participate in the striker group
			this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "striker", payload: {} });

			// retrieve the assigned zone from the striker group
			this._zone = this._messaging.receiveTrainer(MessageType.strikerZone);
			if (this._zone == undefined) {
				return;
			}
			this._moveDest = this._zone!.defaultPos;
		}

		// search for a good pass dest
		if (this._reEvaluatePassDest()) {
			this._searchForPassDest();
		}

		// be close to the defense area to catch possible stray shots
		let cbDistToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea();
		if (this._passDestSuggestion && !Referee.isFriendlyFreeKickState()
				&&  Field.distanceToDefenseArea(this._passDestSuggestion, cbDistToDefenseArea, false) < 0.8) {

			let intersection = Field.intersectRayDefenseArea(this._moveDest!, G.OpponentGoal - this._moveDest!, cbDistToDefenseArea + 0.3, false)[0];
			this._moveDest = intersection || this._moveDest;
		}

		// check whether the agent would change its state to accepting an incoming pass (striker should not be active then)
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable && Attack.checkPassInfos(this._robot, passInfoTable, false)[0] === true) {
			throw new Error("Striker shouldn't accept passes");
		}

		if (passInfoTable) {
			for (let passInfo of passInfoTable) {
				vis.addCircle("t/striker", this._moveDest!, 0.1, vis.colors.slateHalf, true);
				if (this._passDestSuggestion) {
					let color = passInfo.target === this._robot
						? vis.colors.turquoiseHalf : vis.colors.whiteHalf;
					vis.addCircle("t/striker", passInfo.ballPos, 0.1, color, true);
					vis.addCircle("t/striker", this._passDestSuggestion, 0.14,
						vis.colors.whiteHalf, false, undefined, undefined, 0.03);
					vis.addPath("t/striker", [this._moveDest!, this._passDestSuggestion],
						vis.colors.slateHalf, undefined, undefined, 0.02);
				}
			}
		}
		// set path obstacles to not interfere with the current attack
		let moveTime = undefined;
		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		// send a suggestion for a pass in the run
		if (this._passDestSuggestion && attackPosition) {
			this._suggestPass._suggestPass(this._passDestSuggestion, attackPosition, moveTime);
		}

		this._robot.trajectory.update(ToTarget, this._moveDest, (World.Ball.pos - this._robot.pos).angle());
	}
}
