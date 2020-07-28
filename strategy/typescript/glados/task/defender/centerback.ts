import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import { ForceShoot } from "glados/task/ability/forceshoot";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";

const G = World.Geometry;

export class CenterBack extends Task {
	private _preliminaryCenterbackTarget: {pos: Position};
	private _lookingToGoal: boolean = true;
	private _obstacleTable: PathHelper.PathHelperParameters;
	private _forceShoot: ForceShoot;

	// centerbackTarget has to be updated by the caller
	constructor(behavior: Behavior, centerbackTarget: {pos: Position}) {
		super(behavior);

		if (centerbackTarget == undefined) {
			throw new Error("CB has to be called with a non null centerbackTarget");
		}
		this._preliminaryCenterbackTarget = centerbackTarget;

		this._lookingToGoal = true;
		this._obstacleTable = {
			ignoreBall: true,
			task: this,
		};
		this._forceShoot = new ForceShoot(this);
	}

	run() {
		this._messaging.sendToTrainerRepeated(MessageType.groupApplication,
			{ name: "centerback", payload: this._preliminaryCenterbackTarget });

		const pos_target = this._messaging.receiveTrainer(MessageType.centerBackPosTarget);

		let destinationPos = pos_target ? pos_target.pos : UtilDefense.centerBackDefaultPos;
		let destinationTime = (pos_target != undefined && pos_target.time != undefined) ? pos_target.time : Infinity;

		let toBallAngle = (World.Ball.pos - this._robot.pos).angle();
		let toGoalAngle = (World.Geometry.OpponentGoal - this._robot.pos).angle();
		let toCornerLeftAngle = (new Vector(-World.Geometry.FieldWidthHalf,
				World.Geometry.FieldHeightHalf) - this._robot.pos).angle();
		let toCornerRightAngle = (new Vector(World.Geometry.FieldWidthHalf,
				World.Geometry.FieldHeightHalf) - this._robot.pos).angle();
		let fromGoalAngle = (this._robot.pos - World.Geometry.FriendlyGoal).angle();

		let hystAngle = 5 * Math.PI / 180;
		let dir = toBallAngle;
		if ((this._lookingToGoal && toBallAngle < toCornerLeftAngle + hystAngle  &&
				toBallAngle > toCornerRightAngle + hystAngle)  ||
				(toBallAngle < toCornerLeftAngle - hystAngle  &&
				toBallAngle > toCornerRightAngle - hystAngle)) {
			dir = toGoalAngle;
			this._lookingToGoal = true;
		} else {
			this._lookingToGoal = false;
		}

		let maxAngleTilt = 40 * Math.PI / 180;
		dir = geom.normalizeAnglePositive(dir + 0.5 * Math.PI) - 0.5 * Math.PI;
		dir = MathUtil.bound(fromGoalAngle - maxAngleTilt, dir, fromGoalAngle + maxAngleTilt);

		if (!ObserverRobot.hadBall(this._robot, 0)) {
			this._forceShoot._forceShootTimer = undefined;
		}
		let chipActivationAngle = Math.PI / 6;
		let isGame = World.RefereeState === "Game" || World.RefereeState === "GameForce";
		if (isGame && dir > chipActivationAngle && dir < Math.PI - chipActivationAngle  &&
				Vector.fromAngle(dir).absoluteAngleDiff(destinationPos - G.FriendlyGoal) < Math.PI
					&&  World.Ball.pos.distanceTo(this._robot.pos) < 1
					&&  this._robot.pos.distanceTo(destinationPos) < 1) {
			debug.set("chip", true);
			this._forceShoot._doForceShoot();
			this._robot.chip(2);
		}

		// centerbacks always have opponent robot obstacles during opponent ball placement,
		// as we might get stuck on an opponent robot while trying to evade the ball placement obstacle
		// and thus commit an interferred ball placement foul
		this._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
			< 4 * this._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05 &&
			World.RefereeState !== "BallPlacementDefensive";

		this._obstacleTable.ignoreFriendlyRobots = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
			< 2 * this._robot.radius + UtilDefense.centerBackDistanceToDefenseArea() + 0.05
			&& this._robot.pos.distanceTo(destinationPos) < 0.5;
		this._obstacleTable.ignorePass = this._obstacleTable.ignoreFriendlyRobots;
		this._obstacleTable.ignoreBall = this._obstacleTable.ignoreFriendlyRobots;
		let trajModule = (this._obstacleTable.ignoreOpponentRobots) ? CurvedMaxAccel : ToTarget;

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);
		if (mainAttacker && Referee.isFriendlyFreeKickState() && World.Ball.pos.y < World.Geometry.FieldHeightHalf) {
			let startPos = World.Ball.pos;
			let endPos = mainAttacker.pos;
			this._robot.path.addLine(startPos.x, startPos.y, endPos.x, endPos.y, mainAttacker.radius * 2 + 0.1, "", 100);
		}

		this._robot.trajectory.update(trajModule, destinationPos, dir, undefined,
				Physics.robotMinEndspeed(this._robot, destinationPos, destinationTime));
		this._messaging.sendBroadcast(MessageType.moveDest, destinationPos);
	}
}
