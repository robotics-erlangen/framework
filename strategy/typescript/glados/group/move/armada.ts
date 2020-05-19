import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { FreeKick } from "glados/agent/attacker/freekick";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { Circuit } from "glados/task/attacker/circuit";
import { StopAttack } from "glados/task/attacker/stopattack";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as Attack from "glados/util/attack";
import * as MovesHelper from "glados/util/moveshelper";

let G = World.Geometry;

// the armada has 4 steps to form stairs, depending on ball distance
const POSITIONS_ORIG: Position[] = [
	new Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	new Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0),
	new Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	new Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5),
];

const MAX_RANDOM_POSITION_OFFSET = 0.8;

function getRandomOffsetVector(): Vector {
	let result = new Vector(0,0);
	result.x = (MathUtil.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5);
	result.y = (MathUtil.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5);
	return result;
}

// biased random for setting the position backwards
function randomExtension(min: number): number {
	return MathUtil.round(min + MAX_RANDOM_POSITION_OFFSET * Math.pow(MathUtil.random(), 2), 1);
}

export class Armada extends Move {
	public static MIN_ROBOTS: number = 5;
	public static MAX_ROBOTS: number = 5;
	public static ALLOW_EXTRA_ATTACKERS = false;

	_circleCenter: Position;
	_positions: Position[];
	_maxShootingAngle: number;
	_assignment: number[] | undefined;
	_startedSendPassPos: boolean;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._circleCenter = new Vector(0,0) + getRandomOffsetVector();
		this._positions = [];
		this._maxShootingAngle = 60 / 180 * Math.PI;
		this._startedSendPassPos = false;
	}

	static canStart() {
		return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 && Armada.Referee.opponentTouchedLast()
			&&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
			&&  World.RefereeState === "Stop";
	}

	_canContinue() {
		if (Armada.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
			&&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
			&&  World.RefereeState === "Stop";
	}

	_updateTasks(): MoveParameters {
		// draw circles where robots cannot shoot a volley
		let [center1, center2, radius] = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, this._maxShootingAngle);
		let circle = center1.y < center2.y ? center1 : center2;
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		let passInfo;
		if (passInfoTable != undefined) {
			passInfo = passInfoTable.values().next().value;
		}
		let startMoving = Attack.checkPassInfoFromPosition(this._robots[0], passInfo, this._circleCenter, undefined, false);
		if (World.RefereeState === "Stop") {
			this._positions = [];
			this._assignment = undefined;
		} else if (Armada.Referee.isFriendlyFreeKickState() && this._positions.length === 0) {
			// calculate position
			for (let i = 0;i < 4;i++) {
				let pos = POSITIONS_ORIG[i].copy();
				if (World.Ball.pos.x > 0) {
					pos.x = -pos.x;
				}
				pos = pos + getRandomOffsetVector();
				// shift positions to make volley possible
				if (pos.distanceTo(circle) <= radius) {
					let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2;
					let intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, pos - posToShiftFrom, circle, radius)[0]!;
					pos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom).withLength(randomExtension(intersectionWithCircle.distanceTo(posToShiftFrom) + 0.1));
				}
				this._positions.push(Field.limitToAllowedField(pos, 0.3));
			}
		}
		if (startMoving && this._assignment == undefined) {
			// assign robots to positions
			this._assignment = MovesHelper.assignRobots(this._robots.slice(1), this._positions);
		}

		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		if (World.RefereeState === "Stop") {
			taskAssignments[this._robots[0]] = { class: StopAttack, params: [] };
			taskAssignments[this._robots[1]] = { class: Circuit, params: [ this._circleCenter, Math.PI * 0.0 ], restart: this._startedSendPassPos };
			taskAssignments[this._robots[2]] = { class: Circuit, params: [ this._circleCenter, Math.PI * 0.5 ], restart: this._startedSendPassPos };
			taskAssignments[this._robots[3]] = { class: Circuit, params: [ this._circleCenter, Math.PI * 1.0 ], restart: this._startedSendPassPos };
			taskAssignments[this._robots[4]] = { class: Circuit, params: [ this._circleCenter, Math.PI * 1.5 ], restart: this._startedSendPassPos };
			this._startedSendPassPos = false;
		} else if (startMoving && this._assignment != undefined) {
			taskAssignments[this._robots[0]] = { behavior: FreeKick, params: [] };

			for (let i = 1;i < 5;i++) {
				if (passInfo != undefined && this._positions[i - 1].distanceTo(passInfo.ballPos) < 0.1) {
					taskAssignments[this._robots[this._assignment[i - 1]]]
						= {class: AcceptPass, params: [this._positions[i - 1], 0.1]};
				} else {
					taskAssignments[this._robots[this._assignment[i - 1]]]
						= {class: MoveToPos, params: [ this._positions[i - 1], undefined, true ] }; // offer other positions for redeciding
				}
			}
		} else {
			taskAssignments[this._robots[0]] = { behavior: FreeKick, params: [] };
			for (let i = 1;i < 5;i++) {
				taskAssignments[this._robots[i]] = { class: Circuit, params: [ this._circleCenter,
					Math.PI * 0.5 * (i - 1), undefined, this._positions[i - 1], true ], restart: !this._startedSendPassPos };
			}
			this._startedSendPassPos = true;
		}
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}
}
