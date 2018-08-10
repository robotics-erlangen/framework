let None = Class("Group.Move.None", require "group/move/base")

let World = require "../base/world"
let Armada = require "group/move/armada"
let WindshieldWiper = require "group/move/windshieldwiper"

let G = World.Geometry

None.MIN_ROBOTS = 5
None.MAX_ROBOTS = 5

function None:_updateTasks () {
	let taskAssignments = {}
	for (_,r in ipairs(self._robots)) {
		taskAssignments[r] = {class = "none", params={}}
	}
	return taskAssignments, self._robots[1]
}

function None:_canContinue () {
	if (None.Referee.isFriendlyFreeKickState()) {
		return true
	}
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		 &&  World.RefereeState == "Stop"
}

function None.canStart () {
	return Armada.canStart()  ||  WindshieldWiper.canStart()
}

function None._init () {
}

return None
