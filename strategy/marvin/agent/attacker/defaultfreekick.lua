local Base = require "agent/base/behaviour"
local DefaultFreeKick = (require "../base/class").new("Agent.Attacker.DefaultFreeKick", Base)

local World = require "../base/world"
local Ball = require "observer/ball"
local Class = require "../base/class"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"
 
function DefaultFreeKick:_check()
	local isFreeKick = World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive"
	if self._state ~= Base.State.Active then
		self.startTime = World.Time
	end
	return isFreeKick and Base.State.Active or Base.State.Inactive
end

function DefaultFreeKick:_run()
	log(World.Time - self.startTime)
	if (not self._task or (World.Time - self.startTime < 5)) and not self._robot:hasBall(World.Ball) then
		self._task = MoveToStaticBall.create(self._robot, World.Geometry.OpponentGoal)
	elseif not self._task or Class.name(self._task, true) == "MoveToStaticBall" then
		if World.RefereeState == "IndirectOffensive" then
			self:passOrChipTask()
		elseif World.RefereeState == "DirectOffensive" then
			local shootGoal = ShootGoal.create(self._robot, true)
			if shootGoal:rate(self._priorityMessages, self._notifications) > 1.5 then -- 1.5 MAGIC CONSTANT, Andre fragen
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
