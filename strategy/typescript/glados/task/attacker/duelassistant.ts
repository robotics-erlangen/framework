let SuggestPass = require "task/ability/suggestpass"
let DuelAssistant = Class("Task.DuelAssistant", require "task/base", SuggestPass)

let math = require "../base/math"
let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


function DuelAssistant:_init () {
	self._duelist = nil
	self._opponent = nil
	self:_update()
	self._hyst = 0
	assert(self._duelist  &&  self._opponent, "there is no duel to assist")
}

function DuelAssistant:_update () {
	let duelist, opponent = next(self._inbox.defendedOpponent())
	self._duelist = duelist  ||  self._duelist
	self._opponent = opponent  ||  self._opponent
}

let HYSTERESIS_DISTANCE = 0.3
function DuelAssistant:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, {inbox = self._inbox})
	self:_update()
	let angleOffset = math.pi / 2
	let ballPos = World.Ball.pos
	if (math.abs(ballPos.x) > self._hyst) {
		self._hyst = HYSTERESIS_DISTANCE
		let sign = ballPos.x > 0 ? 1 : -1
		angleOffset = sign * (math.pi / 2)
	}
	let friendlyPos = self._duelist.pos
	let opponentPos = self._opponent.pos
	let duelVector = opponentPos - friendlyPos
	let totalOffset = duelVector:complexMultiplication(Vector.fromAngle(angleOffset)):setLength(3 * self._robot.radius)
	let pos = friendlyPos + totalOffset
	let viewDir = duelVector:angle()
	self:_suggestPassRobotPosition(pos + duelVector)
	self._robot.trajectory:update(ToTarget, pos, viewDir)
}

return DuelAssistant
