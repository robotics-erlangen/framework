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
local PassInTheRun = require "task/passintherun"

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
		self._send.attackerRequest("trainer")
		self._requestingPoolChange = true
	end

	local pass
	local bestPassRating = 0
	for robot, sugg in pairs(self._inbox.passSuggestion()) do
		if sugg.rating > bestPassRating then
			pass = sugg
			pass.target = robot
			bestPassRating = sugg.rating
		end
	end
	local _, timeAdvance = Ball.firstAtBall() -- must be me because of mainAttacker
	if pass and timeAdvance > 1.5 then -- only if we have a lot of time
		if pass.kind == "direct" then
			return DirectPass, { pass.target }
		else -- in the run
			return PassInTheRun, { pass.target, pass.pos, Settings.shootDriveSpeed }
		end
	else -- under pressure
		return SaveBall
	end
end

return HandleBall
