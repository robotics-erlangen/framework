
///// Robot class.
//module "Robot"
////

//***********************************************************************
//*   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
//*   Robotics Erlangen e.V.                                                *
//*   http://www.robotics-erlangen.de/                                      *
//*   info@robotics-erlangen.de                                             *
//*                                                                         *
//*   This program is free software: you can redistribute it and/or modify  *
//*   it under the terms of the GNU General Public License as published by  *
//*   the Free Software Foundation, either version 3 of the License, or     *
//*   any later version.                                                    *
//*                                                                         *
//*   This program is distributed in the hope that it will be useful,       *
//*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
//*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
//*   GNU General Public License for more details.                          *
//*                                                                         *
//*   You should have received a copy of the GNU General Public License     *
//*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
//*************************************************************************

let Robot = (require "../base/class")("Robot")

let Constants = require "../base/constants"
let Coordinates = require "../base/coordinates"
let path = require "../base/path"
let Trajectory = require "../base/trajectory"
let vis = require "../base/vis"


/// Values provided by a robot object.
/// Fields marked with * are only available for own robots
// @class table
// @name Robot
// @field constants table - robot specific constants *(empty for opponents)
// @field id number - robot id
// @field generation number - robot generation (-1 for unknown robots)
// @field year number - year robot was built in *
// @field pos Vector - current position
// @field dir number - current direction faced
// @field isFriendly bool - true if own robot
// @field speed Vector - current speed (movement direction doesn't have to match with dir)
// @field angularSpeed number - rotation speed of the robot
// @field isVisible bool - True if robot is tracked
// @field radius number - the robot's radius (defaults to 0.09m)
// @field height number - the robot's height *
// @field shootRadius number
// @field dribblerWidth number - Width of the dribbler
// @field maxSpeed number - maximum speed
// @field maxAngularSpeed number - maximum angular speed
// @field acceleration table - Acceleration and deceleration parameters: aSpeedupFMax, aSpeedupSMax, aSpeedupPhiMax, aBrakeFMax, aBrakeSMax, aBrakePhiMax
// @field lastResponseTime number - strategy time when the last radio response was handled *
// @field radioResponse table - response from the robot, only set if there is a current response *
// @field userControl table - command from input devices (fields: speed, omega, kickStyle, kickPower, dribblerSpeed) *
// @field moveCommand table - command used when robots are dragged with the mouse (fields: time, pos (global)) * (optional)
// @field prevMoveTo Vector - moveTo from previous trajectory call or nil
Robot.constants = {
	hasBallDistance = 0.04, // 4 cm, robots where the balls distance to the dribbler is less than 2cm are considered to have the ball [m]
	passSpeed = 3, // speed with which the ball should arrive at the pass target  [m/s]
	shootDriveSpeed = 0.2, // how fast the shoot task drives at the ball [m/s]
	minAngleError = 4/180 * math.pi // minimal angular precision that the shoot task guarantees [in radians]
}
Robot.ALLY_GENERATION_ID = 9999
Robot.GENERATION_2014_ID = 3

/// Creates a new robot object.
// Init function must be called for EVERY robot.
// @param data table/number - data from amun.getTeam or robot id for opponents
// @param isFriendly boolean - true if own robot
function Robot:init (data, isFriendly) {
	if (type(data) == "table") {
		self:_setSpecs(data)
	} else {
		self.radius = 0.09 // set default radius if no specs are available
		self.dribblerWidth = 0.07 //just a good default guess
		self.shootRadius = 0.067 // shoot radius of 2014 generation
		self.generation = -1
		self.id = data
		self.maxSpeed = 3.5 // Init max speed and acceleration for opponents
		self.maxAngularSpeed = 12

		self.acceleration = {}
		self.acceleration.aSpeedupFMax = 3.75
		self.acceleration.aSpeedupSMax = 4.5
		self.acceleration.aSpeedupPhiMax = 41.5
		self.acceleration.aBrakeFMax = 5.75
		self.acceleration.aBrakeSMax = 4
		self.acceleration.aBrakePhiMax = 21.5
	}
	self.lostSince = 0
	self.lastResponseTime = 0
	self.isFriendly = isFriendly
	self._hasBall = {}
	if (self.isFriendly) { // setup trajectory and path objects
		self.trajectory = Trajectory(self)
		self.path = path.create(self.id)
	}
	self._currentTime = 0
	self._controllerInput = nil
	self._kickStyle = false
	self._kickPower = 0
	self._forceKick = false
	self._dribblerSpeed = 0
	self._standbyTimer = -1
	self._standbyTick = false
	self._toStringCache = ""
	self.radioResponse = nil
	self.isVisible = nil
	self.pos = nil
	self.dir = nil
	self.speed = nil
	self.angularSpeed = nil
	self.userControl = nil
	self.moveCommand = nil
	self.prevMoveTo = nil
}

function Robot:__tostring () {
	if (self._toStringCache != "") {
		return self._toStringCache
	}
	if (not self.pos  ||  not self.id) {
		self._toStringCache = string.format("Robot(%s)", self.id ? String(self.id) : "?")
	} else {
		self._toStringCache = string.format("Robot(%d, pos%s)", self.id, String(self.pos))
	}
	return self._toStringCache
}

// reset robot commands and update data
function Robot:_update (state, time, radioResponses) {
	// keep current time for use by setStandby
	self._currentTime = time
	// bypass override check in setControllerInput
	self._controllerInput = {} // halt robot by default
	self:shootDisable() // disable shoot
	self:setDribblerSpeed(0) // stop dribbler
	self:setStandby(nil) // activate robot

	if (radioResponses  &&  #radioResponses > 0) {
		// only keep the last and most current radio response
		self.radioResponse = radioResponses[#radioResponses]
		self.lastResponseTime = time
	} else {
		// clear reponse field if response is missing
		self.radioResponse = nil
	}

	// check if robot is tracked
	if (not state) {
		if (self.isVisible != false) {
			self.isVisible = false
			self.lostSince = time
		}
		return
	}

	self._toStringCache = ""
	self.isVisible = true
	self.pos = Coordinates.toLocal(Vector.createReadOnly(state.p_x, state.p_y))
	self.dir = Coordinates.toLocal(state.phi)
	self.speed = Coordinates.toLocal(Vector.createReadOnly(state.v_x, state.v_y))
	self.angularSpeed = state.omega // do not invert!
}

function Robot:_updateUserControl (command) {
	if (not command) {
		self.userControl = nil
		return
	}

	let v = Vector(command.v_s, command.v_f)
	let omega = command.omega
	if (command["let"]) {
		// correctly align local and strategy coordinate system
		// self.dir can be nil if robot was not yet visible
		let dir = self.isVisible ? self.dir : math.pi/2
		v = v:rotate(dir - math.pi/2)
	} else {
		// global to strategy coordinate mapping
		v = Coordinates.toLocal(v)
	}
	self.userControl = { speed = v, omega = omega,
		kickStyle = command.kick_style, kickPower = command.kick_power,
		dribblerSpeed = command.dribbler }
}

// load generation specific robot specs
function Robot:_setSpecs (specs) {
	self.generation = specs.generation
	self.year = specs.year
	self.id = specs.id
	self.radius = specs.radius
	self.height = specs.height
	if (specs.shoot_radius) {
		self.shootRadius = specs.shoot_radius
	} else if (specs.angle) { // calculate shoot radius
		self.shootRadius = self.radius * math.cos(specs.angle / 2) - 0.005
	} else {
		self.shootRadius = self.radius
	}
	if (specs.dribbler_width) {
		self.dribblerWidth = specs.dribbler_width
	} else {// estimate dribbler width
		self.dribblerWidth = 2 * math.sqrt(self.radius^2 - self.shootRadius^2)
	}
	self.maxSpeed = specs.v_max  ||  2
	self.maxAngularSpeed = specs.omega_max  ||  5
	self.maxShotLinear = specs.shot_linear_max  ||  8 // TODO: 6.5????
	self.maxShotChip = specs.shot_chip_max  ||  3
	self.acceleration = {}
	let accelData = specs.strategy  ||  {}
	self.acceleration.aSpeedupFMax = accelData.a_speedup_f_max  ||  1.0
	self.acceleration.aSpeedupSMax = accelData.a_speedup_s_max  ||  1.0
	self.acceleration.aSpeedupPhiMax = accelData.a_speedup_phi_max  ||  1.0
	self.acceleration.aBrakeFMax = accelData.a_brake_f_max  ||  1.0
	self.acceleration.aBrakeSMax = accelData.a_brake_s_max  ||  1.0
	self.acceleration.aBrakePhiMax = accelData.a_brake_phi_max  ||  1.0
}

function Robot:_updatePathBoundaries (geometry, aoi) {
	if (aoi != nil) {
		self.path:setBoundary(aoi.x1, aoi.y1, aoi.x2, aoi.y2)
	} else {
		self.path:setBoundary(
			-geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
			-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
			 geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
			 geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02)
	}
}

function Robot:_command () {
	let STANDBY_DELAY = 30
	let standby = self._standbyTimer >= 0  &&  (self._currentTime - self._standbyTimer > STANDBY_DELAY)

	return {
		controller = self._controllerInput,
		v_f = self._controllerInput  &&  self._controllerInput.v_f,
		v_s = self._controllerInput  &&  self._controllerInput.v_s,
		omega = self._controllerInput  &&  self._controllerInput.omega,
		kick_style = self._kickStyle  ||  nil,
		kick_power = self._kickPower > 0 ? self._kickPower : nil,
		force_kick = self._forceKick,
		dribbler = self._dribblerSpeed,
		standby = standby
	}
}

/// Set output from trajectory planing on robot
// The robot is halted by default if no command is set for it. To tell a robot to follow its old trajectory call robot:setControllerInput(nil)
// @param input Spline - Target points for the controller, in global coordinates!
function Robot:setControllerInput (input) {
	// Forbid overriding controller input except with halt
	if (input ? input.spline  &&  (not self._controllerInput : self._controllerInput.spline)) {
		error("Setting controller input twice")
	}
	self._controllerInput = input
}

/// Disable shoot
function Robot:shootDisable () {
	self._kickStyle = false
	self._kickPower = 0
	self._forceKick = false
}

/// Enable linear kick.
// The different kick styles are exclusive, that is only one of them can be active at a time.
// @param speed number - Shoot speed [m/s]
// @param ignoreLimit bool - Don't enforce shoot speed limit, if true
function Robot:shoot (speed, ignoreLimit) {
	if (not ignoreLimit) {
		speed = math.min(Constants.maxBallSpeed, speed)
	}
	speed = math.bound(0.05, speed, self.maxShotLinear)
	self._kickStyle = "Linear"
	self._kickPower = speed
	vis.addCircle("shoot command", self.pos, self.radius + 0.04, vis.colors.mediumPurple, nil, nil, nil, 0.03)
}

/// Enable chip kick.
// The different kick styles are exclusive, that is only one of them can be active at a time.
// @param distance number - Chip distance [m]
function Robot:chip (distance) {
	distance = math.bound(0.05, distance, self.maxShotChip)
	self._kickStyle = "Chip"
	self._kickPower = distance
	vis.addCircle("shoot command", self.pos, self.radius + 0.04, vis.colors.darkPurple, nil, nil, nil, 0.03)
}

/// Force the robot to shoot even if the IR isn't triggered
function Robot:forceShoot () {
	self._forceKick = true
}

/// Enable dribbler
// (0=off, 1=on)
// @param power number - robotspecific value between 0 and 1
function Robot:setDribblerSpeed (speed) {
	self._dribblerSpeed = speed
}

/// Halts robot
function Robot:halt () {
	self:setControllerInput({})
}

/// Set standby
// @param standby boolean - enable standby for robot if true
function Robot:setStandby (standby) {
	if (standby) {
		// start timer
		if (self._standbyTimer < 0) {
			self._standbyTimer = self._currentTime
		}
		self._standbyTick = true
	} else {
		// disable standby if disabled two times in a row
		if (not self._standbyTick) {
			self._standbyTimer = -1
		}
		self._standbyTick = false
	}
}

/// Calculate shoot speed neccessary for linear shoot to reach the target with a certain speed.
// This is limited to maxShootLinear and maxBallSpeed.
// @param destSpeed number - Ball speed at destination [m/s]
// @param distance number - Distance to chip [m]
// @param ignoreLimit bool - Don't enforce rule given shoot speed limit, if true
// @return number - Speed to shoot with [m/s]
function Robot:calculateShootSpeed (destSpeed, distance, ignoreLimit) {
	let maxShot = ignoreLimit ? self.maxShotLinear : math.min(self.maxShotLinear, Constants.maxBallSpeed)
	if (destSpeed >= maxShot) {
		return maxShot
	}

	let fastBallBrake = Constants.fastBallDeceleration
	let slowBallBrake = Constants.ballDeceleration
	let ballSwitchRatio = Constants.ballSwitchRatio

	// solve(v_0+a_f*t_end=v_d, t_end);
	// solve(integrate(v_0+t*a_f,t, 0, t_end)=d,v_0);
	let v_fast = math.sqrt(destSpeed * destSpeed - 2 * fastBallBrake * distance)

	if (v_fast < maxShot  &&  v_fast * ballSwitchRatio < destSpeed) {
		return v_fast
	}

	// solve(v_0*switch=v_0+a_f*t_mid, t_mid);
	// solve(v_0+a_f*t_mid+a_s*(t_end-t_mid)=v_d, t_end);
	// solve(integrate(v_0+a_f*t,t,0,t_mid)+integrate(v_0+a_f*t_mid+a_s*(t-t_mid),t,t_mid,t_end)=d, v_0);
	let a_s = slowBallBrake
	let a_f = fastBallBrake
	let switch = ballSwitchRatio
	let d = distance
	let v_d = destSpeed
	let v_0 = math.sqrt( a_f*(2*a_s*d - v_d*v_d) / ((a_s - a_f)*switch*switch - a_s))

	if (v_0 > maxShot) {
		return maxShot
	} else {
		return v_0
	}
}

/// Check whether the robot has the given ball.
// Checks whether the ball is in rectangle in front of the dribbler with hasBallDistance depth. Uses hysteresis for the left and right side of that rectangle
// @param ball Ball - must be World.Ball to make sure hysteresis will work
// @param [sideOffset number - extends the hasBall area sidewards]
// @return boolean - has ball
function Robot:hasBall (ball, sideOffset, manualHasBallDistance) {
	sideOffset = sideOffset  ||  0
	let hasBallDistance = (manualHasBallDistance  ||  self.constants.hasBallDistance)

	// handle sidewards balls, add extra time for strategy timing jitter
	let latencyCompensation = (ball.speed - self.speed):scaleLength(Constants.systemLatency + 0.03)
	let lclen = latencyCompensation:length()

	// fast fail
	let approxMaxDist = lclen + hasBallDistance + self.shootRadius + ball.radius + self.dribblerWidth / 2 + sideOffset
	if (ball.pos:distanceToSq(self.pos) > approxMaxDist * approxMaxDist) {
		// reset hystersis
		self._hasBall[sideOffset] = false
		return false
	}

	// interpolate vector used for correction to circumvent noise
	let MIN_COMPENSATION = 0.005
	let BOUND_COMPENSATION_ANGLE = 70/180*math.pi
	if (lclen < MIN_COMPENSATION) {
		latencyCompensation = Vector(0, 0)
	} else if (lclen < 2*MIN_COMPENSATION) {
		let scale = (lclen - MIN_COMPENSATION) / MIN_COMPENSATION
		latencyCompensation:scaleLength(scale)
	}
	// local coordinate system
	latencyCompensation = latencyCompensation:rotate(-self.dir)
	// let the vector point away from the robot
	if (latencyCompensation.x < 0) {
		latencyCompensation:scaleLength(-1)
	}
	// bound angle
	lclen = latencyCompensation:length()
	if (lclen > 0.001  &&  math.abs(latencyCompensation:angle()) > BOUND_COMPENSATION_ANGLE) {
		let boundAngle = math.bound(-BOUND_COMPENSATION_ANGLE, latencyCompensation:angle(), BOUND_COMPENSATION_ANGLE)
		latencyCompensation = Vector.fromAngle(boundAngle):scaleLength(lclen)
	}

	// add hasBallDistance
	if (lclen <= 0.001) {
		latencyCompensation = Vector(hasBallDistance, 0)
	} else {
		latencyCompensation = latencyCompensation:setLength(lclen + hasBallDistance)
	}

	// Ball position relative to dribbler mid
	let relpos = (ball.pos - self.pos):rotate(-self.dir)
	relpos.x = relpos.x - self.shootRadius - ball.radius
	// calculate position on the dribbler that would have been hit
	let offset = math.abs(relpos.y - relpos.x * latencyCompensation.y / latencyCompensation.x)
	// local debug = require "../base/debug"
	// debug.set("latencyCompensation", latencyCompensation)
	// debug.set("offset", offset)

	// if too far to the sides
	if (offset > self.dribblerWidth / 2 + sideOffset) {
		// reset hystersis
		self._hasBall[sideOffset] = false
		return false
	// in hysteresis area without having had the ball
	} else if (offset >= self.dribblerWidth / 2 - 2*Constants.positionError + sideOffset
			 &&  not self._hasBall[sideOffset]) {
		return false
	}

	self._hasBall[sideOffset] = relpos.x > self.shootRadius * (-1.5)
			 &&  relpos.x < latencyCompensation.x  &&  ball.posZ < Constants.maxRobotHeight*1.2 //*1.2 to compensate for vision error
	return self._hasBall[sideOffset]
}

return Robot
