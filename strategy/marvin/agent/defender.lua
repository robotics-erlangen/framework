local Defender = (require "../base/class").new("Agent.Defender", require "agent/base")
local World = require "../base/world"
local CenterBack = require "task/centerback"
local ManMark = require "task/manmark"

function Defender.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Defender:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper
end

function Defender:_run(priorityMessages, notifications, trainerMessage)
	local centerBack
	
	if trainerMessage.specialTask.centerBack == self._robot then
		-- switch to centerback
		if not self._task or not self._task:instanceOf(CenterBack) then
			self._task = CenterBack.create(self._robot)
		end
		centerBack = self._task
	else
		-- switch to manmark
		if not self._task or not self._task:instanceOf(ManMark) then
			self._task = ManMark.create(self._robot)
		end
	end
	
	-- create centerback if neccessary and get rating
	local centerBack = centerBeck or CenterBack.create(self._robot)
	local centerBackRating = centerBack:rate(priorityMessages, notifications)

	return {specialTask = { centerBack = centerBackRating } }
end

return Defender
