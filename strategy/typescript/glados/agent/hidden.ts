let Base = require "agent/base/agent"
let Hidden = Class("Agent.Hidden", Base)

let Default = require "agent/hidden/default"


Hidden._behaviors = {
	Default
}

function Hidden.takeRobot (robots) {
	for (_, robot in ipairs(robots)) {
		if (not robot.isVisible) {
			return robot
		}
	}
}

function Hidden:keepRobot () {
	return not self._robot.isVisible  &&  not self._robot.userControl
}

function Hidden:rateRobot () {
	return 0
}

return Hidden
