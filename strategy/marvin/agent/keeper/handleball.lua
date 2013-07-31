local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Keeper.HandleBall", Base)

local World = require "../base/world"
local Field = require "util/field"
local Referee = require "util/referee"
local ChipAway = require "task/chipaway"
local AggressiveKeeper = require "task/aggressivekeeper"


function HandleBall:check()
	if Referee.isStopState() then 
		return false
	end
	if World.RefereeState == "PenaltyDefensive" or World.RefereeState == "PenaltyDefensivePrepare"
			or World.GameStage == "PenaltyShootout" then
		return false
	end
	--if a slow ball enters the defense area
	local active = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0) < 2*self._robot.radius 
			and World.Ball.speed:length() <= Settings.slowBall
	if active then
		-- force being mainAttacker
		self.send("trainer").specialRole({mainAttacker = 2})
		return true
	else
		return false
	end
end

function HandleBall:updateTask()	
	--track opponent robots in defense area
	local danger = false
	for _,r in pairs(World.OpponentRobots) do
		if Field.distanceToFriendlyDefenseArea(r.pos, r.radius) < 2*r.radius then
			danger = true
		end
	end
	
	--check if there is a danger of a own goal
	local ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	local robotDist = Field.distanceToFriendlyGoalLine(self._robot.pos, 0)
	local owngoal = ballDist < robotDist
	
	--decide whether to chip away or move aggressively to the ball
	if danger and not owngoal then
		--set the task to nil to ensure that a new task will be created
		self._task = nil
		return AggressiveKeeper
	else
		return ChipAway
	end	
end

return HandleBall
