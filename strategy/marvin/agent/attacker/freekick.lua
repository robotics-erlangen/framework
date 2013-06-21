local Base = require "agent/base/behaviour"
local FreeKick = (require "../base/class").new("Agent.Attacker.FreeKick", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Class = require "../base/class"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"
 
function FreeKick:_check()
	local isFreeKick = World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive"
	if self._state ~= Base.State.Active then
		self.startTime = World.Time
	end
	return isFreeKick and Base.State.Active or Base.State.Inactive
end

function FreeKick:_run()
	if (not self._task or (World.Time - self.startTime < 5)) and not self._robot:hasBall(World.Ball) then
		self._task = MoveToStaticBall.create(self._robot, World.Geometry.OpponentGoal)
	elseif not self._task or Class.name(self._task, true) == "MoveToStaticBall" then
		if World.RefereeState == "IndirectOffensive" then
			self:passOrChipTask()
		elseif World.RefereeState == "DirectOffensive" then
			local shootGoal = ShootGoal.create(self._robot, true)
			if shootGoal:canShoot() then
				self._task = shootGoal
			else 
				self:passOrChipTask()
			end
		end
	end
end

function FreeKick:passOrChipTask()
	local function canPassTo(r)
		return self._messages[r] and self._messages[r].task.assistantRating 
			and Robot.wayToRobotFree(r, self._robot)
	end
	local function cmpAssistantByRating(r1, r2)
		return self._messages[r1].task.assistantRating > self._messages[r2].task.assistantRating
	end
	local freeAssistants = table.filter(World.FriendlyRobots, canPassTo)
	table.sort(freeAssistants, cmpAssistantByRating)
	local bestRobot = freeAssistants[1]
	if bestRobot then
		self._task = DirectPass.create(self._robot, bestRobot, true)
	else
		self._task = ChipAway.create(self._robot)
	end
end

return FreeKick
