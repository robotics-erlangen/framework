local Defender = (require "../base/class").new("Agent.Defender", require "agent/base")
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
	return robot.isVisible and robot ~= World.FriendlyKeeper
end

function Defender:_run(priorityMessages, notifications, trainerMessage)
	local centerBackRating = CenterBack:rate(priorityMessages, notifications)

	if(trainerMessage.specialTask.centerBack == self._robot) then
		self._task = CenterBack.create(self._robot)
	else
		self._task = ManMark.create(self._robot)
	end

	return {specialTask = { centerBack = centerBackRating }}
end

return Defender