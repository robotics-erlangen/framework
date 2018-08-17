let Base = require "agent/base/agent"
let Manual = Class("Agent.Manual", Base)

let Default = require "agent/manual/default"


Manual._behaviors = {
	Default
}

function Manual.takeRobot (robots) {
	for (let robot of robots) {
		// take robots which get command from an input device
		if (robot.userControl) {
			return robot
		}
	}
}

function Manual:keepRobot () {
	return this._robot.userControl
}

function Manual:rateRobot () {
	return 0
}

return Manual
