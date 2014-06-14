local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local Shoot = require "observer/shoot"
local SaveBall = require "task/saveball"
local Field = require "util/field"
local debug = require "../base/debug"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"

function HandleBall:check()
	if not Referee.isFriendlyFreeKickState()
		and not Referee.isStopState()
		and not Referee.isKickoffState()
	then
		local _, timeAdvance = Ball.firstAtBall()
		if timeAdvance > -Settings.defenseRiskLevel then
			self:_applyForMainAttacker()
		end
	end
	return self._inbox.mainAttacker().trainer == self._robot
end

function HandleBall:_updateTask()
	local changeDist = World.Geometry.FieldHeight / 4
	local defenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	debug.set("changeDist", changeDist)
	debug.set("defenseDist", defenseDist)
	if defenseDist > changeDist then
		self._send.attackerRequest("all")
		self._requestingPoolChange = true
	end

	local bestAssi = Shoot.bestFreeAssistant(self._robot)
	local _, timeAdvance = Ball.firstAtBall()
	if bestAssi and timeAdvance > 1.5 then -- we're really slow atm (iran open)
		return DirectPass, { bestAssi, true }
	else -- under pressure
		return SaveBall
	end
end

return HandleBall
