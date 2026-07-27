/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import * as geom from "base/geom";
import { FriendlyRobot, Robot } from "base/robot";
import { parameterizeClass } from "base/types";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { FreeKick } from "glados/agent/attacker/freekick";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, MoveParameters } from "glados/group/move/base";
import { FixedMAMove } from "glados/group/move/fixedmamove";
import { StrikerSampling } from "glados/task/ability/strikersampling";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { StopAttack } from "glados/task/attacker/stopattack";
import { Support } from "glados/task/attacker/support";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as Attack from "glados/util/attack";
import * as MovesHelper from "glados/util/moveshelper";

const G = World.Geometry;

function getRobotsInRect(c1: Position, c2: Position, robots: readonly Robot[], buffer: number): Robot[] {
	let r: Robot[] = [];
	vis.addAxisAlignedRectangle("g/m/mrlTestCorner: Rect", c1 + new Vector(-buffer, buffer), c2 + new Vector(buffer, -buffer), vis.colors.red);
	for (let v of robots) {
		if (geom.insideRect(c1 + new Vector(-buffer, buffer), c2 + new Vector(buffer, -buffer), v.pos)) {
			r.push(v);
		}
	}
	return r;
}

function taskAssignment(passInfoTable: any, pos1: Position, pos2: Position, robot: FriendlyRobot, enemyAmm: number): Assignment {
	let ballSide = (World.Ball.pos.x > 0) ? 1 : -1;
	let acceptPass = Attack.checkPassInfos(robot, passInfoTable, false)[0];
	if (acceptPass) {
		return Assignment.create({ class: AcceptPass });
	} else if (enemyAmm > 0) {
		return Assignment.create({ class: MoveToPos, params: [{ pos: new Vector(pos1.x * ballSide, pos1.y) }] });
	} else {
		return Assignment.create({
			class: Support,
			params: [
				{
					isStriker: true,
					samplingCtor: StrikerSampling,
					manualDefaultPos: new Vector(pos1.x * ballSide, pos1.y),
					manualPassDest: new Vector(pos2.x * ballSide, pos2.y),
				}
			]
		});
	}
}

const MRLTESTCORNER_FREEKICK = parameterizeClass(FreeKick, Attack.defaultRatePass);

export class MrlTestCorner extends FixedMAMove {
	public static readonly MIN_ROBOTS: number = 5;
	public static readonly MAX_ROBOTS: number = 5;

	public static canStart(): boolean {
		// _canContinue must not fail during freekick state if this move is to be allowed to start in freekick state
		// - don't waste time by restarting different moves
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5
			&& Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
			&& (World.RefereeState === "Stop"
				&& MrlTestCorner.Referee.opponentTouchedLast()
				|| MrlTestCorner.Referee.isFriendlyFreeKickState());
	}

	private static readonly _DISTRACTOR_POSITIONS: Position[] = [
		new Vector(0.3, G.OpponentGoal.y - (G.DefenseHeight + 0.4)),
		new Vector(0.0, G.OpponentGoal.y - (G.DefenseHeight + 0.4)),
		new Vector(-0.3, G.OpponentGoal.y - (G.DefenseHeight + 0.4))
	];
	private _distractorAttackPos: Position[];
	private static readonly _ACTIVE_ROBOT_INIT_POS: Position = new Vector(-G.FieldWidthHalf / 1.4, G.FieldHeightHalf - 1);
	private _activeRobotShootPos: Position;
	private _restart: boolean = true;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._distractorAttackPos = [];
		for (let i = 0; i < 3; i++) {
			this._distractorAttackPos.push(MrlTestCorner._DISTRACTOR_POSITIONS[i] - new Vector((i) * 0.3 + 0.3, 0.5));
		}

		this._activeRobotShootPos = new Vector(G.FieldWidthHalf / 2, G.FieldHeightHalf * 0.3);
	}

	public canContinue(): boolean {
		if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
			&& Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
			&& World.RefereeState === "Stop";
	}


	protected _updateTasks(): MoveParameters {

		// draw circles where robots cannot shoot a volley
		let [center1, center2, radius] = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, geom.degreeToRadian(55));
		let circle = center1.y < center2.y ? center1 : center2;

		if (this._activeRobotShootPos.distanceTo(circle) <= radius) {
			let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2;
			let intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, this._activeRobotShootPos - posToShiftFrom, circle, radius)[0]!;
			this._activeRobotShootPos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom).withLength(intersectionWithCircle.distanceTo(posToShiftFrom) + 0.1);
		}
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.RefereeState === "Stop") {
			taskAssignments[this._robots[0]] = Assignment.create({ class: StopAttack, params: [] });
		} else if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
			taskAssignments[this._robots[0]] = Assignment.createBehaviorAssignment({ behavior: MRLTESTCORNER_FREEKICK });
			this._restart = false;
		}

		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];

		let buffer = 0.1;
		taskAssignments[this._robots[1]] = taskAssignment(passInfoTable, MrlTestCorner._ACTIVE_ROBOT_INIT_POS, this._activeRobotShootPos, this._robots[1], 0);

		let enemyRobots = getRobotsInRect(MrlTestCorner._DISTRACTOR_POSITIONS[0], MrlTestCorner._DISTRACTOR_POSITIONS[2] + new Vector(-0.6, 0.4), World.OpponentRobots, buffer);
		for (let i = 0; i < 3; i++) {
			taskAssignments[this._robots[i + 2]] = taskAssignment(passInfoTable, MrlTestCorner._DISTRACTOR_POSITIONS[i], this._distractorAttackPos[i], this._robots[i + 2], enemyRobots.length);
		}

		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}

	public static sortRobotsByPriority(robots: FriendlyRobot[]): FriendlyRobot[] {
		const localSort = (robots: FriendlyRobot[]): FriendlyRobot[] => {
			const ballSide = (World.Ball.pos.x > 0) ? 1 : -1;
			const activeRobotInitPos = new Vector(ballSide * MrlTestCorner._ACTIVE_ROBOT_INIT_POS.x, MrlTestCorner._ACTIVE_ROBOT_INIT_POS.y);

			// search robot with closest distance to ACTIVE_ROBOT_INIT_POS pos
			const robotsWithDistancesToActiveRobotInitPos: [FriendlyRobot, number][] = robots.map((robot) => [robot, robot.pos.distanceTo(activeRobotInitPos)]);
			robotsWithDistancesToActiveRobotInitPos.sort((robotA, robotB) => robotA[1] - robotB[1]);
			const activeRobot = robotsWithDistancesToActiveRobotInitPos[0][0];
			const activeRobotIndex = robots.indexOf(activeRobot);
			robots.splice(activeRobotIndex, 1);

			// sort rest of robots according to their distance to the ball
			const robotsWithDistancesToDistractorPositions: [FriendlyRobot, number][] = robots.map((robot) => [robot, robot.pos.distanceTo(MrlTestCorner._DISTRACTOR_POSITIONS[1])]);
			robotsWithDistancesToDistractorPositions.sort((robotA, robotB) => robotA[1] - robotB[1]);
			robots = robotsWithDistancesToDistractorPositions.map(([robot, _distance]) => robot);

			robots.unshift(activeRobot);

			return robots;
		};

		return FixedMAMove._sortRobotsByPriorityMAFirst(robots, localSort);
	}
}
