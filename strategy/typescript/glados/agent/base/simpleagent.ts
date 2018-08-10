let Base = require "agent/base/agent"
let SimpleAgent = Class("Agent.Base.SimpleAgent", Base)

let World = require "../base/world"


// Child class must set _behaviors
// SimpleAgent._behaviors = {}

function SimpleAgent:init (robot, messaging) {
	Base.init(self, robot, messaging)
	self.beOffensive = false
}

function SimpleAgent.takeRobot (robots) {
	for (_, robot in ipairs(robots)) {
		if (SimpleAgent.checkRobot(robot)) {
			return robot
		}
	}
}

function SimpleAgent.checkRobot (robot) {
	return robot.isVisible  &&  robot != World.FriendlyKeeper  &&  not robot.userControl
}

function SimpleAgent:keepRobot () {
	return self.checkRobot(self._robot)
}

function SimpleAgent:rateRobot () {
	return 1
}

return SimpleAgent
