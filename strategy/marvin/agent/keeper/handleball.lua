local Base = require "agent/base/behaviour"
local HandleBall = (require "../base/class").new("Agent.Keeper.HandleBall", Base)

local World = require "../base/world"
local Field = require "util/field"
local ChipAway = require "task/chipaway"
local AggressiveKeeper = require "task/aggressivekeeper"

function HandleBall:_check()
	--if a slow ball enters the defense area
	local active = Field.isInFriendlyDefenseArea(World.Ball.pos, 0) and World.Ball.speed:length() <= Settings.slowBall
	return (active and World.RefereeStare ~= "Stop") and Base.State.Active or Base.State.Inactive
end

local badrobots
function HandleBall:_run() 
	--hysteresis constant
	local extraDistance = 0.1

	local stillDanger = false
	if not badrobots then
		badrobots = {}
	else
		for r,_ in pairs(badrobots) do
			if Field.distanceToFriendlyDefenseArea(r.pos, r.radius) <= extraDistance then
				--if a dangerous robot is still near the defense area
				stillDanger = true
			else
				--if too far away, remove that robot
				badrobots[r] = nil
			end
		end
	end

	--track opponent robots in defense area
	for _,r in pairs(World.OpponentRobots) do
		if Field.isInFriendlyDefenseArea(r.pos, r.radius) then
			--if any robot is inside the defense area, it becomes a dangerous one
			badrobots[r] = true
			stillDanger = true
		end
	end
	
	--decide whether to chip away or move aggressively to the ball
	if not stillDanger then
		self._task = ChipAway.create(self._robot)
	else
		self._task = AggressiveKeeper.create(self._robot)
	end
end

return HandleBall
