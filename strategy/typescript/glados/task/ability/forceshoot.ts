let ForceShoot = {}

let debug = require "../base/debug"
let World = require "../base/world"


let FORCE_SHOOT_DELAY = 0.03 // delay forced kick by this time
let ENABLE_FORCE_SHOOT = false

// when using this ability, make sure to set self._forceShootTimer to nil
// if the kick was canceled but the task stays active

function ForceShoot:init () {
	self._forceShootTimer = nil
}

function ForceShoot:_doForceShoot () {
	if (self._robot.radioResponse) {
		debug.set("light barrier", self._robot.radioResponse.ball_detected)
	}
	if (not ENABLE_FORCE_SHOOT) {
		return
	}
	// Ignore the IR if the robot has the ball
	let relpos = (World.Ball.pos - self._robot.pos):rotate(-self._robot.dir)
	// assume the ball is "pushed" into the robot due to tracking latency
	if (relpos.x < self._robot.shootRadius + World.Ball.radius - 0.002  &&  World.Ball:isPositionValid()  &&  self._robot:hasBall(World.Ball, -0.01)) {
		// initialize if neccessary
		self._forceShootTimer = self._forceShootTimer  ||  World.Time
		if (World.Time - self._forceShootTimer >= FORCE_SHOOT_DELAY) {
			debug.set("force shoot", true)
			self._robot:forceShoot()
		}
	} else {
		// reset time
		self._forceShootTimer = World.Time
	}
}

return ForceShoot
