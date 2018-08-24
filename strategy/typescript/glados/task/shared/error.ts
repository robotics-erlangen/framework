import {amunFunctions as amun} from "base/amun";
import {Vector} from "base/vector";
import * as World from "base/world";
import {Direct} from "glados/trajectory/direct"
import {ToTarget} from "glados/trajectory/totarget";
import * as PathHelper from "glados/trajectory/pathhelper";
import {Task, Agent} from "glados/task/base";

let G = World.Geometry;

// [robotId] => (firstLocationId, secondLocationId)
let EXCHANGE_TARGET = [{firstPosI : 0, secPosI: 17},
						{firstPosI: 1, secPosI: 16},
						{firstPosI: 2, secPosI: 15},
						{firstPosI: 3, secPosI: 14},
						{firstPosI: 4, secPosI: 13},
						{firstPosI: 5, secPosI: 12},
						{firstPosI: 6, secPosI: 23},
						{firstPosI: 7, secPosI: 22},
						{firstPosI: 8, secPosI: 21},
						{firstPosI: 9, secPosI: 20},
						{firstPosI: 10,secPosI: 19},
						{firstPosI: 5, secPosI: 12},
						{firstPosI: 2, secPosI: 15},
						{firstPosI: 10,secPosI: 19},
						{firstPosI: 0,secPosI: 17},
						{firstPosI: 11,secPosI: 18}];
let X0 = -1;
let B = 0.33;
let L = 0.25;

export class Error extends Task {
	_id: number;
	_goToTopBlock: boolean;
	_startRotate: number | undefined;


	constructor (agent: Agent) {
		super(agent);
		this._id = EXCHANGE_TARGET[this._robot.id+1].firstPosI
		this._goToTopBlock = false
	}

	public run () {
		amun.setRobotExchangeSymbol(this._robot.generation, this._robot.id,true)
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, {ignorePass: true})

		let y0
		if (this._goToTopBlock) {
			y0 = G.FieldWidthHalf - 1
		} else {
			y0 = -G.FieldWidthHalf
		}
		// check Ball
		if (this._goToTopBlock  &&
				G.FieldWidthHalf-1.5 < World.Ball.pos.x  && World.Ball.pos.x < G.FieldWidthHalf+0.5  &&
				-1.5< World.Ball.pos.y && World.Ball.pos.y < 1.5) {
			y0 = G.FieldWidthHalf * (-1)
			this._goToTopBlock = false
		} else if (!this._goToTopBlock  &&
				-G.FieldWidthHalf+1.5 > World.Ball.pos.x && World.Ball.pos.x > -G.FieldWidthHalf-0.5  &&
				-1.5 < World.Ball.pos.y && World.Ball.pos.y < 1.5) {
			y0 = G.FieldWidthHalf - 1
			this._goToTopBlock = true
		}
		let xi = X0 + B * (this._id % 6) + B/2
		let yi = y0 + L * Math.floor(this._id/6) + L/2
		let toPos = new Vector(yi,xi)
		for (let r of World.Robots) {
			if (this._robot != r && r.pos.distanceTo(toPos) < this._robot.radius) {
				this._id = (this._id == EXCHANGE_TARGET[this._robot.id+1].firstPosI)  &&
					EXCHANGE_TARGET[this._robot.id+1].secPosI || EXCHANGE_TARGET[this._robot.id+1].firstPosI
				xi = X0 + B * (this._id % 6) + B/2
				yi = y0 + L * Math.floor(this._id/6) + L/2
				toPos = new Vector(yi,xi)
			}
		}
		if (this._robot.pos.distanceTo(toPos) > 0.05) {
			this._robot.trajectory.update(ToTarget, toPos, 0)
		} else if (this._startRotate == undefined) {
			this._startRotate = World.Time
		} else if (this._startRotate != undefined && World.Time - this._startRotate < 1) {
			this._robot.trajectory.update(Direct, new Vector(0, 0), undefined, 2*Math.PI)
		}
	}
}