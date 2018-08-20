import {Behavior} from "glados/agent/base/behavior";
let Default = Class("Agent.Hidden.Default", Base)

let RescueRobot = require "task/hidden/rescuerobot"


function Default:check () {
	return true
}

function Default:_updateTask () {
	return RescueRobot
}

return Default
