--[[
--- Robot class.
module "Robot"
]]--
local debug = require "../base/debug"
local Coordinates = require "../base/coordinates"
local Trajectory = require "../base/trajectory"
local Constants = require "../base/constants"

local Robot = (require "../base/class").new("Robot")

--- Values provided by a robot object.
--- Fields marked with * are only available for own robots
-- @class table
-- @name Robot
-- @field constants table - robot specific constants *(empty for opponents)
-- @field id number - robot id
-- @field generation number - robot generation *
-- @field year number - year robot was built in *
-- @field pos Vector - current position
-- @field dir number - current direction faced
-- @field isFriendly bool - true if own robot
-- @field speed Vector - current speed (movement direction doesn't have to match with dir)
-- @field angularSpeed number - rotation speed of the robot
-- @field isVisible bool - True if robot is tracked
-- @field radius number - the robot's radius (defaults to 0.09m)
-- @field height number - the robot's height *
-- @field shootRadius number *
-- @field dribblerWidth number - Width of the dribbler *
-- @field maxSpeed number - maximum speed *
-- @field maxAngularSpeed number - maximum angular speed *
Robot.constants = {
	hasBallDistance = 0.03, -- 3 cm, robots where the balls distance to the dribbler is less than 2cm are considered to have the ball [m]
	passSpeed = 1.8, -- speed with which the ball should arrive at the pass target  [m/s]
	shootDriveSpeed = 0.2, -- how fast the shoot task drives at the ball [m/s]
	minAngleError = 4/180 * math.pi -- minimal angular precision that the shoot task guarantees [in radians]
}

-- Init function must be called for EVERY robot
function Robot:init(data, isFriendly, geometry)
	if type(data) == "table" then
		self:_setSpecs(data)
	else
		self.radius = 0.09 -- set default radius if no specs are available
		self.shootRadius = self.radius
		self.id = data
		self.dribblerWidth = 0.06 -- FIXME just a good default guess
		self.maxSpeed = 1 -- Init max speed and acceleration for opponents
		self.maxAcceleration = 1
	end
	self.isFriendly = isFriendly
	if self.isFriendly then
		self.trajectory = Trajectory.create(self)
		self.path = path.create()
		self.path:setBoundary(
			-geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
			-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
			 geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
			 geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02)
	end
end

function Robot.mt:__tostring()
	return string.format("Robot(pos = (%6.3f, %6.3f))",
		self.pos.x, self.pos.y)
end

function Robot:_update(state, time)
	self:setControllerInput(nil)
	self:shootDisable()
	self:setDribblerSpeed(nil)
	self:setStandby(nil)

	if not state then
		if self.isVisible ~= false then
			self.isVisible = false
			self.lostSince = time
		end
		return
	end

	self.isVisible = true
	self.pos = Coordinates.toLocal(Vector.createReadOnly(state.p_x, state.p_y))
	self.dir = Coordinates.toLocal(state.phi)
	self.speed = Coordinates.toLocal(Vector.createReadOnly(state.v_x, state.v_y))
	self.angularSpeed = state.omega -- do not invert!
end

function Robot:_setSpecs(specs)
	self.generation = specs.generation
	self.year = specs.year
	self.id = specs.id
	self.radius = specs.radius
	self.height = specs.height
	if specs.angle then
		self.shootRadius = self.radius * math.cos(specs.angle / 2)
	else
		self.shootRadius = self.radius
	end
	if specs.dribbler_width then
		self.dribblerWidth = specs.dribbler_width
	else
		self.dribblerWidth = 2 * math.sqrt(self.radius^2 - self.shootRadius^2)
	end
	if specs.v_max then
		self.maxSpeed = specs.v_max
	end
	if specs.omega_max then
		self.maxAngularSpeed = specs.omega_max
	end
	if specs.shot_linear_max then
		self.maxShotLinear = specs.shot_linear_max
	end
	if specs.shot_chip_max then
		self.maxShotChip = specs.shot_chip_max
	end
	if specs.acceleration then
		self.acceleration = {}
		self.acceleration.aSpeedupFMax = specs.acceleration.a_speedup_f_max or 0
		self.acceleration.aSpeedupSMax = specs.acceleration.a_speedup_s_max or 0
		self.acceleration.aSpeedupPhiMax = specs.acceleration.a_speedup_phi_max or 0
		self.acceleration.aBrakePhiMax = specs.acceleration.a_brake_phi_max or 0
		self.acceleration.aBrakePhiMax = specs.acceleration.a_brake_phi_max or 0
		self.acceleration.aBrakePhiMax = specs.acceleration.a_brake_phi_max or 0
		
		self.maxAcceleration = specs.acceleration.a_speedup_f_max or 1.0 -- magic constant
	end
end

function Robot:_setCommand()
	amun.setCommand(self.id, {
		controller = self._controllerInput,
		kick_style = self._kickStyle,
		kick_power = self._kickPower,
		dribbler = self._dribblerSpeed,
		standby = self._standby
	})
end

--- Set output from trajectory planing on robot
-- @param input Vector[] - Target points for the controller, in global coordinates! (not strategy coordinates)
function Robot:setControllerInput(input)
	if input and self._controllerInput then
		error("Setting controller input twice")
	end
	self._controllerInput = input
end

function Robot:shootDisable()
	self._kickStyle = nil
	self._kickPower = nil
end

function Robot:shootLinear(power)
	self._kickStyle = "Linear"
	self._kickPower = power
end

function Robot:shootChip(power)
	self._kickStyle = "Chip"
	self._kickPower = power
end

function Robot:setDribblerSpeed(speed) -- (0=off, 1=on)
	self._dribblerSpeed = speed
end

function Robot:setStandby(standby)
	self._standby = standby
end

--- Chip function stub
-- @param distance number - Distance to chip
function Robot:chip(distance)
	log("Error: no implementation for function chip for robot generation "..self.generation)
end

function Robot.calculateShootSpeed(destSpeed, distance)
	distance = distance + destSpeed*destSpeed/(2*math.abs(Constants.ballDeceleration))
	return math.sqrt(2*math.abs(Constants.ballDeceleration)*distance)
end

--- Shoot function wrapper
-- @param destSpeed number - Ball speed at destination
-- @param distance number - Distance to shoot
function Robot:shoot(destSpeed, distance)
	local speed = self.calculateShootSpeed(destSpeed, distance)
	self:_shoot(speed)
end

--- Shoot function wrapper
-- @param speed number - Ball speed after shot
function Robot:_shoot(speed)
	log("Error: no implementation for function shoot for robot generation "..self.generation)
end

--[[
-- *****************
-- * Robot HELPERs *
-- *****************

function Robot:isAt(pos, dir, posThreshold, dirThreshold)
	if posThreshold == nil then
		posThreshold = config.defaultMovePosThreshold
	end
	if dirThreshold == nil then
		dirThreshold = config.defaultMoveDirThreshold
	end

	return (self.pos:distanceTo(pos) < posThreshold) and (math.abs(geom.getAngleDiff(self.dir, dir)) < dirThreshold)
end

function Robot:isIn(robots)
	if not robots then return false end
	for i, robot in ipairs(robots) do
		if robot == self then return i end
	end
	return false
end
]]--

function Robot:posToBall(ball)
	local relpos = (ball.pos - self.pos):rotate(-self.dir)
	relpos.x = relpos.x - self.shootRadius - ball.radius
	debug.set("relpos", relpos)
	return relpos
end

function Robot:distToBall(ball)
	return self:posToBall(ball).x
end

function Robot:hasBall(ball)
	local relpos = self:posToBall(ball)
	local offset = math.abs(relpos.y)
	if offset > self.dribblerWidth / 2 + Constants.positionError then
		return false
	elseif offset >= self.dribblerWidth / 2 - Constants.positionError and not self._hasBall then
		return false
	end
	
	self._hasBall = relpos.x > -self.shootRadius and relpos.x < self.constants.hasBallDistance + ball.speed:length() * Constants.systemLatency
	return self._hasBall
	-- FIXME consider robot speed relative to ball
end

return Robot
