import * as geom from "base/geom";
import { FriendlyRobot, Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";
import { FreeKick } from "glados/agent/attacker/freekick";
import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move } from "glados/group/move/base";
import { AcceptPass } from "glados/task/attacker/acceptpass";
import { StopAttack } from "glados/task/attacker/stopattack";
import { Striker } from "glados/task/attacker/striker";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as Attack from "glados/util/attack";
import * as MovesHelper from "glados/util/moveshelper";

let G = World.Geometry;

function getRobotsInRect(c1: Position, c2: Position, robots: Robot[], buffer: number): Robot[] {
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
	let acceptPass = Attack.checkPassInfos(robot, passInfoTable, false);
	if (acceptPass) {
		return { class: AcceptPass };
	} else if (enemyAmm > 0) {
		return { class: MoveToPos, params: [new Vector(pos1.x * ballSide, pos1.y)]};
	} else {
		return { class: Striker, params: [ new Vector(pos1.x * ballSide, pos1.y), new Vector(pos2.x * ballSide, pos2.y) ]};
	}
}

export class MrlTestCorner extends Move {
	public static MIN_ROBOTS: number = 5;
	public static MAX_ROBOTS: number = 5;

	public static canStart(): boolean {
		return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 && MrlTestCorner.Referee.opponentTouchedLast()
			&& Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
			&& World.RefereeState === "Stop";
	}

	private _distractorPositions: Position[];
	private _distractorAttackPos: Position[];
	private _activeRobotInitPos: Position;
	private _activeRobotShootPos: Position;
	private _restart: boolean = true;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		let goalDist = G.DefenseRadius + 0.4;
		this._distractorPositions = [
			new Vector(0.3, G.OpponentGoal.y - goalDist),
			new Vector(0.0, G.OpponentGoal.y - goalDist),
			new Vector(-0.3, G.OpponentGoal.y - goalDist)
		];
		this._distractorAttackPos = [];
		for (let i = 0;i < 3;i++) {
			this._distractorAttackPos.push(this._distractorPositions[i] - new Vector((i) * 0.3 + 0.3, 0.5));
		}

		this._activeRobotInitPos = new Vector(-G.FieldWidthHalf / 1.4, G.FieldHeightHalf - 1);
		this._activeRobotShootPos = new Vector(G.FieldWidthHalf / 2, G.FieldHeightHalf * 0.3);
	}

	public _canContinue(): boolean {
		if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
			&&  Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
			&&  World.RefereeState === "Stop";
	}


	_updateTasks(): [Map<FriendlyRobot, Assignment>, FriendlyRobot] {

		// draw circles where robots cannot shoot a volley
		let [center1, center2, radius] = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, 55 / 180 * Math.PI);
		let circle = center1.y < center2.y ? center1 : center2;

		if (this._activeRobotShootPos.distanceTo(circle) <= radius) {
			let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2;
			let intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, this._activeRobotShootPos - posToShiftFrom, circle, radius)[0]!;
			this._activeRobotShootPos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom).setLength(intersectionWithCircle.distanceTo(posToShiftFrom) + 0.1);
		}
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.RefereeState === "Stop") {
			taskAssignments[this._robots[0]] = { class: StopAttack, params: [] };
		} else if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
			taskAssignments[this._robots[0]] = { behavior: FreeKick };
			this._restart = false;
		}

		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];

		let buffer = 0.1;
		taskAssignments[this._robots[1]] = taskAssignment(passInfoTable, this._activeRobotInitPos, this._activeRobotShootPos, this._robots[1], 0);

		let enemyRobots = getRobotsInRect(this._distractorPositions[0], this._distractorPositions[2] + new Vector(-0.6,0.4), World.OpponentRobots, buffer);
		for (let i = 0;i < 3;i++) {
			taskAssignments[this._robots[i + 2]] = taskAssignment(passInfoTable, this._distractorPositions[i], this._distractorAttackPos[i], this._robots[i + 2], enemyRobots.length);
		}

		return [taskAssignments, this._robots[0]];
	}
}
