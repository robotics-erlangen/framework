--[[
--- Robot class.
module "Robot"
]]--
local debug = require "../base/debug"
local Coordinates = require "../base/coordinates"
local Trajectory = require "../base/trajectory"
local Constants = require "../base/constants"
local amun = amun

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

--- Creates a new robot object.
-- Init function must be called for EVERY robot.
-- @param data table/number - data from amun.getTeam or robot id for opponents
-- @param isFriendly boolean - true if own robot
-- @param geometry World.Geometry - used to setup path object and avoid a circular dependency with world, only required for own robots
function Robot:init(data, isFriendly, geometry)
	if type(data) == "table" then
		self:_setSpecs(data)
	else
		self.radius = 0.09 -- set default radius if no specs are available
		self.dribblerWidth = 0.06 -- just a good default guess
		self.shootRadius = math.sqrt(self.radius^2 - (self.dribblerWidth/2)^2)
		self.id = data
		self.maxSpeed = 1 -- Init max speed and acceleration for opponents
		self.maxAcceleration = 1
	end
	self.isFriendly = isFriendly
	if self.isFriendly then -- setup trajectory and path objects
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
	if not self.pos then
		return "Robot"
	end
	return string.format("Robot(pos = (%6.3f, %6.3f))",
		self.pos.x, self.pos.y)
end

-- reset robot commands and update data
function Robot:_update(state, time)
	self:setControllerInput(nil) -- remove controller input
	self:shootDisable() -- disable shoot
	self:setDribblerSpeed(nil) -- stop dribbler
	self:setStandby(nil) -- activate robot

	-- check if robot is tracked
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

-- load generation specific robot specs
function Robot:_setSpecs(specs)
	self.generation = specs.generation
	self.year = specs.year
	self.id = specs.id
	self.radius = specs.radius
	self.height = specs.height
	if specs.angle then -- calculate shoot radius
		self.shootRadius = self.radius * math.cos(specs.angle / 2)
	else
		self.shootRadius = self.radius
	end
	if specs.dribbler_width then
		self.dribblerWidth = specs.dribbler_width
	else -- estimate dribbler width
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
-- @param input Spline - Target points for the controller, in global coordinates!
function Robot:setControllerInput(input)
	-- Forbid overriding controller input except with halt
	if input and input.spline and self._controllerInput then
		error("Setting controller input twice")
	end
	self._controllerInput = input
end

--- Disable shoot
function Robot:shootDisable()
	self._kickStyle = nil
	self._kickPower = nil
end

--- Enable linear kick.
-- The different kick styles are exclusive, that is only one of them can be active at a time.
-- @param power number - robotspecific value between 0 and 1
function Robot:shootLinear(power)
	self._kickStyle = "Linear"
	self._kickPower = power
end

--- Enable chip kick.
-- The different kick styles are exclusive, that is only one of them can be active at a time.
-- @param power number - robotspecific value between 0 and 1
function Robot:shootChip(power)
	self._kickStyle = "Chip"
	self._kickPower = power
end

--- Enable dribbler
-- (0=off, 1=on)
-- @param power number - robotspecific value between 0 and 1
function Robot:setDribblerSpeed(speed)
	self._dribblerSpeed = speed
end

--- Halts robot
function Robot:halt()
	self:setControllerInput({})
end

--- Set standby
-- @param standby boolean - enable standy for robot if true
function Robot:setStandby(standby)
	self._standby = standby
end

--- Chip function
-- @param distance number - Distance to chip [m]
function Robot:chip(distance)
	log("Error: no implementation for function chip for robot generation "..self.generation)
end

--- Calculate shoot speed neccessary for linear shoot to reach the target with a certain speed
-- @param destSpeed number - Ball speed at destination [m/s]
-- @param distance number - Distance to chip [m]
-- @return number - Speed to shoot with [m/s]
function Robot.calculateShootSpeed(destSpeed, distance)
	distance = distance + destSpeed*destSpeed/(2*math.abs(Constants.ballDeceleration))
	return math.sqrt(2*math.abs(Constants.ballDeceleration)*distance)
end

--- Shoot function wrapper.
-- Calls Robot:_shoot with distance adapted speed
-- @param destSpeed number - Ball speed at destination [m/s]
-- @param distance number - Distance to shoot [m]
function Robot:shoot(destSpeed, distance)
	local speed = self.calculateShootSpeed(destSpeed, distance)
	self:_shoot(speed)
end

--- Shoot function
-- @param speed number - Ball speed to shoot with [m/s]
function Robot:_shoot(speed)
	log("Error: no implementation for function shoot for robot generation "..self.generation)
end

--- Ball position relative to dribbler mid
-- @param ball Ball - ball object to check
-- @return Vector
function Robot:posToBall(ball)
	local relpos = (ball.pos - self.pos):rotate(-self.dir)
	relpos.x = relpos.x - self.shootRadius - ball.radius
	debug.set("relpos", relpos)
	return relpos
end

--- Ball distance to dribbler
-- @param ball Ball - ball object to check
-- @return number - distance between ball and dribbler
function Robot:distToBall(ball)
	return self:posToBall(ball).x
end

--- Check whether the robot has the given ball.
-- Checks whether the ball is in rectangle in front of the dribbler with hasBallDistance depth. Uses hysteresis for the left and right side of that rectangle
-- @param ball Ball - ball object to check
-- @return boolean - has ball
function Robot:hasBall(ball)
	local relpos = self:posToBall(ball)
	local offset = math.abs(relpos.y)
	-- if too far to the sides
	if offset > self.dribblerWidth / 2 + Constants.positionError then
		return false
	-- in hysteresis area without having had the ball
	elseif offset >= self.dribblerWidth / 2 - Constants.positionError and not self._hasBall then
		return false
	end
	
	-- FIXME remove partial system latency hack
	self._hasBall = relpos.x > -self.shootRadius and relpos.x < self.constants.hasBallDistance + ball.speed:length() * Constants.systemLatency
	return self._hasBall
end

return Robot
