local Base = require "agent/base/behaviour"
local HandleBall = (require "../base/class").new("Agent.Keeper.HandleBall", Base)

local World = require "../base/world"
local Field = require "util/field"
local Referee = require "util/referee"
local ChipAway = require "task/chipaway"
local AggressiveKeeper = require "task/aggressivekeeper"


function HandleBall:_check()
	if Referee.isStopState() then 
		return Base.State.Inactive
	end
	if World.RefereeState == "PenaltyDefensive" or World.RefereeState == "PenaltyDefensivePrepare" then
		return Base.State.Inactive
	end
	--if a slow ball enters the defense area
	local active = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0) < self._robot.radius 
			and World.Ball.speed:length() <= Settings.slowBall
	if active then
		local message = { specialTask = { mainAttacker = 2 } }
		return Base.State.Active, message
	else
		return Base.State.Inactive
	end
end

function HandleBall:_run()	
	--track opponent robots in defense area
	local danger = false
	for _,r in pairs(World.OpponentRobots) do
		if Field.isInFriendlyDefenseArea(r.pos, r.radius) then
			danger = true
			
			--set the task to nil to ensure that a new task (AggressiveKeeper) will be created
			self._task = nil
		end
	end
	
	--check if there is a danger of a own goal
	local ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	local robotDist = Field.distanceToFriendlyGoalLine(self._robot.pos, 0)
	local owngoal = ballDist < robotDist
	
	--decide whether to chip away or move aggressively to the ball
	if not self._task then
		if danger and not owngoal then
			self._task = AggressiveKeeper.create(self._robot)
		else
			self._task = ChipAway.create(self._robot)
		end
	end	
end

return HandleBall
