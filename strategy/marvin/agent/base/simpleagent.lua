local Base = require "agent/base/agent"
local SimpleAgent = Class("Agent.Base.SimpleAgent", Base)

local debug = require "../base/debug"
local World = require "../base/world"


-- Child class must set _behaviors
-- SimpleAgent._behaviors = {}

function SimpleAgent:init(robot)
	Base.init(self, robot)
	self._lastIncomingPassTime = 0
	self._lastIncomingPassSender = nil
	self.beOffensive = false
end

function SimpleAgent:_run()
	for sender, msg in pairs(self._inbox.passPos()) do
		if msg.robot == self._robot then
			self._lastIncomingPassTime = World.Time
			self._lastIncomingPassSender = sender
		else -- pass to other robot
			self._lastIncomingPassTime = 0
		end
	end
end

function SimpleAgent.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if SimpleAgent.checkRobot(robot) then
			return robot
		end
	end
end

function SimpleAgent.checkRobot(robot)
	return robot.isVisible and robot ~= World.FriendlyKeeper and not robot.userControl
end

function SimpleAgent:keepRobot()
	return self.checkRobot(self._robot)
end

function SimpleAgent:rateRobot()
	return 1
end

return SimpleAgent
