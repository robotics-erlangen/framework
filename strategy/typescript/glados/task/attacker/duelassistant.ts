let SuggestPass = require "task/ability/suggestpass"
let DuelAssistant = Class("Task.DuelAssistant", require "task/base", SuggestPass)

let math = require "+/base/math"
import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


function DuelAssistant:_init () {
	this._duelist = nil
	this._opponent = nil
	this._update()
	this._hyst = 0
	assert(this._duelist && this._opponent, "there is no duel to assist")
}

function DuelAssistant:_update () {
	let duelist, opponent = next(this._inbox.defendedOpponent())
	this._duelist = duelist || this._duelist
	this._opponent = opponent || this._opponent
}

let HYSTERESIS_DISTANCE = 0.3
function DuelAssistant:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, {inbox = this._inbox})
	this._update()
	let angleOffset = Math.PI / 2
	let ballPos = World.Ball.pos
	if (Math.abs(ballPos.x) > this._hyst) {
		this._hyst = HYSTERESIS_DISTANCE
		let sign = ballPos.x > 0 ? 1 : -1
		angleOffset = sign * (Math.PI / 2)
	}
	let friendlyPos = this._duelist.pos
	let opponentPos = this._opponent.pos
	let duelVector = opponentPos - friendlyPos
	let totalOffset = duelVector:complexMultiplication(Vector.fromAngle(angleOffset)).setLength(3 * this._robot.radius)
	let pos = friendlyPos + totalOffset
	let viewDir = duelVector.angle()
	this._suggestPassRobotPosition(pos + duelVector)
	this._robot.trajectory.update(ToTarget, pos, viewDir)
}

return DuelAssistant
