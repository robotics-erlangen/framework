import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { parameterizeClass } from "base/types";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { FreeKick } from "glados/agent/attacker/freekick";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { StrikerSampling } from "glados/task/ability/strikersampling";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { StopAttack } from "glados/task/attacker/stopattack";
import { Support } from "glados/task/attacker/support";
import * as Attack from "glados/util/attack";
import * as MovesHelper from "glados/util/moveshelper";

const G = World.Geometry;

const WINDSHIELD_WIPER_FREEKICK = parameterizeClass(FreeKick, Attack.defaultRatePass);

export class WindshieldWiper extends Move {
	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 5;
	public static ALLOW_EXTRA_ATTACKERS = false;


	public static canStart(): boolean {
		if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
			return Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
				&&  World.Ball.pos.y > 3 * G.FieldHeightHalf / 5;
			// return true
		}
		return false;
	}

	public _canContinue(): boolean {
		if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return false;
	}

	private _state: string;
	private _distances: {distance: number; robot: FriendlyRobot}[];
	private _positions: Position[];

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._state = "init";
		this._distances = [];
		for (let r of this._robots) {
			this._distances.push({
				distance: r.pos.distanceToSq(World.Ball.pos),
				robot: r
			});
		}
		this._distances.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);
		this._positions = [];
		for (let i = 0;i < this._robots.length;i++) {
			this._positions.push(new Vector((MathUtil.sign(World.Ball.pos.x)) * (i / WindshieldWiper.MAX_ROBOTS - 0.5) * G.FieldWidth * 0.75, G.FieldHeightQuarter * (8 / (5 + i))));
		}
	}

	calcAcceptPos(pos: Vector, robotRadius: number): Vector | undefined {
		let [center1, center2, radius] = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, 55 / 180 * Math.PI);
		let circle = center1.y < center2.y ? center1 : center2;
		let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2;
		let acceptPos = geom.intersectLineCircle(posToShiftFrom, pos - posToShiftFrom, circle, radius)[0];
		if (acceptPos != undefined) {
			if (Field.isInOpponentDefenseArea(acceptPos, 1.5 * robotRadius)) {
				acceptPos = Field.intersectRayDefenseArea(pos, posToShiftFrom - pos, 1.5 * robotRadius, false)[0];
			}
		}
		return acceptPos;
	}


	_updateTasks(): MoveParameters {
		let distances = this._distances;
		// sort(distances,World.Ball)
		let mainrobot = distances[0].robot;
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.RefereeState === "Stop") {
			taskAssignments[mainrobot] = Assignment.create({ class: StopAttack, params: [] });
		} else if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
			taskAssignments[mainrobot] = Assignment.createBehaviorAssignment({ behavior: WINDSHIELD_WIPER_FREEKICK });
		}

		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		let pos = this._positions;
		let acceptingRobots = new Set<number>();
		for (let i = 1;i < this._robots.length;i++) {
			if (passInfoTable && Attack.checkPassInfos(distances[i].robot, passInfoTable, false)[0]) {
				acceptingRobots.add(i);
			}

			const defaultPos = new Vector(-pos[i].x, pos[i].y);
			let acceptPos = this.calcAcceptPos(pos[i], this._robots[i].radius);
			if (!acceptPos) {
				acceptPos = defaultPos;
			}

			taskAssignments[distances[i].robot] = Assignment.create({
				class: Support,
				params: [
					{ isStriker: true, samplingCtor: StrikerSampling },
					defaultPos,
					acceptPos,
				]
			});
		}
		if (acceptingRobots.size > 0) {
			for (let i = 1;i < this._robots.length;i++) {
				if (acceptingRobots.has(i)) {
					taskAssignments[distances[i].robot] = Assignment.create({ class: AcceptPass});
				} else {
					const defaultPos = pos[i];
					let acceptPos = this.calcAcceptPos(pos[i], this._robots[i].radius);
					if (!acceptPos) {
						acceptPos = defaultPos;
					}

					taskAssignments[distances[i].robot] = Assignment.create({
						class: Support,
						params: [
							{ isStriker: true, samplingCtor: StrikerSampling },
							defaultPos,
							acceptPos,
						],
						restart: true,
					});
				}
			}
		}

		return {
			assignments: taskAssignments,
			mainAttacker: mainrobot
		};
	}
}
