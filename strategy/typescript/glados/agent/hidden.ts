let Base = require "agent/base/agent"
let Hidden = Class("Agent.Hidden", Base)

let Default = require "agent/hidden/default"


Hidden._behaviors = {
	Default
}

function Hidden.takeRobot (robots) {
	for (let robot of robots) {
		if (not robot.isVisible) {
			return robot
		}
	}
}

function Hidden:keepRobot () {
	return not this._robot.isVisible && not this._robot.userControl
}

function Hidden:rateRobot () {
	return 0
}

return Hidden
