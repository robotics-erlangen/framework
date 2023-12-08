import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, RelativePosition, Vector } from "base/vector";
import * as World from "base/world";

import * as BallObserver from "glados/observer/ball";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import { Direct } from "glados/trajectory/direct";
import * as PathHelper from "glados/trajectory/pathhelper";

const G = World.Geometry;

const WALLKICK_SPEED = 2.5;
const START_DIST_WALLKICK = 0.18;
const WALLKICK_ANGLE_UP = geom.degreeToRadian(20);
const WALLKICK_ANGLE_DOWN = geom.degreeToRadian(160);
const ENSURE_CONTACT_DIRECT_SPEED = 0.12;

export class WallkickAbility {
	private _placementPos: Position;
	private _wallKickAngle: number = 0;
	private _currentTargetPos: Position | undefined = undefined;
	private _robot: FriendlyRobot;

	private _wallKickStandStartTime: number = 0;
	private _calculateOnce: boolean = true;
	private _firstBallPosWallkick: Position = new Vector(0, 0);
	private _helpRestart: boolean = true;

	public constructor(robot: FriendlyRobot, placementPos: Position) {
		this._placementPos = placementPos;
		this._robot = robot;
	}

	public _wallkick(restart: boolean) {
		let obstacleTable: PathHelper.PathHelperParameters = {
			ignoreDefenseArea: true,
			ignoreOpponentDefenseArea: true,
			ignorePass: true,
			ignoreBallPlacementObstacle: true
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let usedBallPos = BallObserver.getRealisticBallPos();
		if (restart !== this._helpRestart) {
			if (this._calculateOnce) {
				this._firstBallPosWallkick = World.Ball.pos;
			}
			if (this._firstBallPosWallkick.distanceTo(World.Ball.pos) > 0.1 || this._calculateOnce) {
				if (usedBallPos.x > 0 && usedBallPos.y > this._placementPos.y) {
					this._wallKickAngle = -WALLKICK_ANGLE_UP;
				} else if (usedBallPos.x > 0 && usedBallPos.y < this._placementPos.y) {
					this._wallKickAngle = WALLKICK_ANGLE_UP;
				} else if (usedBallPos.x < 0 && usedBallPos.y > this._placementPos.y) {
					this._wallKickAngle = -WALLKICK_ANGLE_DOWN;
				} else if (usedBallPos.x < 0 && usedBallPos.y < this._placementPos.y) {
					this._wallKickAngle = WALLKICK_ANGLE_DOWN;
				}

				this._calculateOnce = false;
			}
			this._currentTargetPos = usedBallPos - Vector.fromAngle(this._wallKickAngle).withLength(START_DIST_WALLKICK);
			this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos, this._wallKickAngle);
		} else {
			let wallKickSpeed = Vector.fromAngle(this._wallKickAngle).withLength(ENSURE_CONTACT_DIRECT_SPEED);
			this._robot.trajectory.update(Direct, wallKickSpeed, this._wallKickAngle);
			this._robot.shoot(WALLKICK_SPEED);
			this._wallKickStandStartTime = 0;
		}
		if (this._robot.pos.distanceTo(<Position> this._currentTargetPos) < 0.01) {
			if (this._wallKickStandStartTime === 0) {
				this._wallKickStandStartTime = World.Time;
			}
			if (World.Time - this._wallKickStandStartTime > 1) {
				this._helpRestart = restart;
				this._calculateOnce = true;
			}
		}
	}
}

