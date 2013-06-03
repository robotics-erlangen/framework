local Base = require "agent/base/behaviour"
local DefaultFreeKick = (require "../base/class").new("Agent.Attacker.DefaultFreeKick", Base)

local World = require "../base/world"
local Ball = require "observer/ball"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
 
function DefaultFreeKick:_check()
	local isFreeKick = World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive"
	return isFreeKick and Base.State.Active or Base.State.Inactive
end

function DefaultFreeKick:_run()
	if not self._task then
		if World.RefereeState == "IndirectOffensive" then
			self:passOrChipTask()
		elseif World.RefereeState == "DirectOffensive" then
			-- TODO create own shoot task with special approaching of ball
			local shootGoal = ShootGoal.create(self._robot)
			-- FIXME which values are to expect?
			if shootGoal:rate(self._priorityMessages, self._notifications) > 0.5 then 
				self._task = shootGoal
			else 
				self:passOrChipTask()
			end
		end
	end
end

function DefaultFreeKick:passOrChipTask()
	local bestRobot = nil
	local bestRating = -1
	for robot, msg in pairs(self._messages) do
		local rating = msg.task.assistantRating
		if rating and rating > bestRating and Ball.wayToRobotFree(robot, self._robot) then
			bestRobot = robot
			bestRating = rating
		end
	end
	self._pass = bestRobot
	if self._pass then
		self._task = DirectPass.create(self._robot, bestRobot, true)
	else
		self._task = ChipAway.create(self._robot)
	end
end

return DefaultFreeKick
