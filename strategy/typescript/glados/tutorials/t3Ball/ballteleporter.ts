import * as DebugCommands from "base/debugcommands";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";
import { MessageBox } from "glados/control/messaging";
import { Assignment, Move } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";
import { TutorialTask } from "glados/tutorials/t3Ball/tutorial3";


export class BallTeleporter extends Move {

	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 1;

	private _initBall: any;
	private _shot: boolean = false;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._initBall = {
			pos: new Vector(0, 4.8),
			posZ: 0,
			speed: new Vector(0, 0),
			speedZ: 0
		};
	}

	public static canStart() {
		return true;
	}

	public _canContinue() {
		return true;
	}

	public _updateTasks(): [Map<FriendlyRobot, Assignment>, undefined] {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		let robotPos = new Vector(0, -World.Geometry.FieldHeightHalf + World.Geometry.DefenseHeight + 0.3);
		let ballPos = new Vector(0, World.Geometry.FieldHeightHalf - World.Geometry.DefenseHeight);

		if (robotPos.distanceToSq(this._robots[0].pos) > (0.1 * 0.1) && !this._shot) {

			taskAssignments[this._robots[0]] = {class: MoveToPos, params: [robotPos]};

		} else if (!this._shot) {

			let leftVector = new Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf) - ballPos;
			let angleLV = leftVector.angle();
			let rightVector = new Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf) - ballPos;
			let angleRV = rightVector.angle();
			let diff = angleRV - angleLV;
			let ang = angleLV + (diff * MathUtil.random());
			let dir = Vector.fromAngle(ang);
			dir.setLength(4.5);

			this._initBall = {
				pos: ballPos,
				posZ: 0,
				speed: dir,
				speedZ: 0
			};

			DebugCommands.moveObjects(this._initBall);

			taskAssignments[this._robots[0]] = {class: MoveToPos, params: [robotPos]};

			this._shot = true;

		} else {

			taskAssignments[this._robots[0]] = {class: TutorialTask};

		}

		return [taskAssignments, undefined];

	}

}
