local SuggestPass = require "task/ability/suggestpass"
local DuelAssistant = Class("Task.DuelAssistant", require "task/base", SuggestPass)

local math = require "../base/math"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function DuelAssistant:_init()
	self._duelist = nil
	self._opponent = nil
	self:_update()
	self._hyst = 0
	assert(self._duelist and self._opponent, "there is no duel to assist")
end

function DuelAssistant:_update()
	local duelist, opponent = next(self._inbox.defendedOpponent())
	self._duelist = duelist or self._duelist
	self._opponent = opponent or self._opponent
end

local HYSTERESIS_DISTANCE = 0.3
function DuelAssistant:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self:_update()
	local angleOffset = math.pi / 2
	local ballPos = World.Ball.pos
	if math.abs(ballPos.x) > self._hyst then
		self._hyst = HYSTERESIS_DISTANCE
		local sign = ballPos.x > 0 and 1 or -1
		angleOffset = sign * (math.pi / 2)
	end
	local friendlyPos = self._duelist.pos
	local opponentPos = self._opponent.pos
	local duelVector = opponentPos - friendlyPos
	local totalOffset = duelVector:complexMultiplication(Vector.fromAngle(angleOffset)):setLength(3 * self._robot.radius)
	local pos = friendlyPos + totalOffset
	local viewDir = duelVector:angle()
	self:_suggestPass(pos + duelVector)
	self._robot.trajectory:update(ToTarget, pos, viewDir)
end

return DuelAssistant
