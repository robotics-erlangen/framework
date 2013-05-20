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

Defender._behaviours = {
	"CenterBack",
	"Default"
}

function Defender:checkCenterBack()
	local isCenterBack = self._trainerMessage.specialTask.centerBack == self._robot
	local centerBack
	if isCenterBack and self._behaviour == "CenterBack" then
		centerBack = self._task
	else
		centerBack = CenterBack.create(self._robot)
	end
	local centerBackRating = centerBack:rate(self._priorityMessages, self._notifications)
	return isCenterBack, {specialTask = { centerBack = centerBackRating } }
end

function Defender:doCenterBack()
	if not self._task then
		self._task = CenterBack.create(self._robot)
	end
end

function Defender:checkDefault()
	return true
end

function Defender:doDefault()
	if not self._task then
		self._task = ManMark.create(self._robot)
	end
end

return Defender
