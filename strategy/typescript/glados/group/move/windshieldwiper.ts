import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import {Vector, Position} from "base/vector";
import {FriendlyRobot} from "base/robot";
import * as World from "base/world";

import {FreeKick} from "glados/agent/attacker/freekick"
import {MessageBox, MessageType} from "glados/control/messaging";
import {StopAttack} from "glados/task/attacker/stopattack"
import {AcceptPass} from "glados/task/attacker/acceptpass"
import {Striker} from "glados/task/attacker/striker";
import * as Attack from "glados/util/attack";
import * as MovesHelper from "glados/util/moveshelper"
import {Move, Assignment} from "glados/group/move/base";

let G = World.Geometry;

function sort (distances: {distance: number, robot: FriendlyRobot}[]) {
		let i = 1
		for (let v of distances) {
			v.distance = v.robot.pos.distanceToSq(World.Ball.pos);
		}
		while (distances[i+1]) {
			if (distances[i].distance > distances[i+1].distance) {
				let tmp = distances[i];
				distances[i] = distances[i+1];
				distances[i+1] = tmp;
				if (i !=1) {
					i = i-1;
				} else {
					i = i+1;
				}
			} else {
				i = i+1;
			}
		}
	}

export class WindshieldWiper extends Move {
	public static MIN_ROBOTS: number = 1
	public static MAX_ROBOTS: number = 5


	public static canStart (): boolean {
		if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
			return Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
				 &&  World.Ball.pos.y > 3 * G.FieldHeightHalf / 5
			//return true
		}
			return false
	}

	public _canContinue (): boolean {
		if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
			return true;
		}
		return false;
	}

	private _state: string;
	private _distances: {distance: number, robot: FriendlyRobot}[];
	private _positions: Position[];

	constructor (robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._state = "init"
		this._distances = []
		for (let v of this._robots) {
			this._distances.push({distance: 0, robot: v});
		}
		this._positions = []
		for (let i = 0;i<this._robots.length;i++) {
			this._positions.push(new Vector((MathUtil.sign(World.Ball.pos.x))*(i/WindshieldWiper.MAX_ROBOTS -0.5) * G.FieldWidth * 0.75, G.FieldHeightQuarter*(8/(5+i))))
		}
		sort(this._distances)
	}


	_updateTasks (): [Map<FriendlyRobot, Assignment>, FriendlyRobot] {
		let distances = this._distances
		//sort(distances,World.Ball)
		let mainrobot = distances[1].robot
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.RefereeState == "Stop") {
			taskAssignments[mainrobot] = { class: StopAttack, params: [] }
		} else if (WindshieldWiper.Referee.isFriendlyFreeKickState()) {
			taskAssignments[mainrobot] = { behavior: FreeKick }
		}

		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		let nr: number | undefined = undefined
		let pos = this._positions
		let [center1, center2, radius] = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, 55 / 180 * Math.PI)
		let circle = center1.y < center2.y ? center1 : center2
		let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
		for (let i = 1;i<this._robots.length;i++) {
			nr = Attack.checkPassInfos(distances[i].robot, passInfoTable, false) ? i : nr
			let acceptPos = geom.intersectLineCircle(posToShiftFrom, pos[i] - posToShiftFrom, circle, radius)[0]
			taskAssignments[distances[i].robot] = {class: Striker, params: [new Vector(-pos[i].x,pos[i].y), acceptPos]}
		}
		if (nr != undefined) {
			taskAssignments[distances[nr].robot] = { class: AcceptPass}

			for (let i=1;i<this._robots.length;i++) {
				if (i != nr) {
					let acceptPos = geom.intersectLineCircle(posToShiftFrom, pos[i] - posToShiftFrom, circle, radius)
					taskAssignments[distances[i].robot] = {class: Striker, params: [pos[i], acceptPos], restart: true}
				}
			}
		}

		return [taskAssignments, mainrobot]
	}
}