let Base from "glados/agent/base/agent"
let SimpleAgent = Class("Agent.Base.SimpleAgent", Base)

import * as World from "base/world";


// Child class must set _behaviors
// SimpleAgent._behaviors = {}

function SimpleAgent:init (robot, messaging) {
	Base.init(self, robot, messaging)
	this.beOffensive = false
}

function SimpleAgent.takeRobot (robots) {
	for (let robot of robots) {
		if (SimpleAgent.checkRobot(robot)) {
			return robot
		}
	}
}

function SimpleAgent.checkRobot (robot) {
	return robot.isVisible && robot != World.FriendlyKeeper && not robot.userControl
}

function SimpleAgent:keepRobot () {
	return this.checkRobot(this._robot)
}

function SimpleAgent:rateRobot () {
	return 1
}

return SimpleAgent
