--[[
--- Robot class.
module "Robot"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local debug = require "../base/debug"
local Coordinates = require "../base/coordinates"
local Trajectory = require "../base/trajectory"
local Constants = require "../base/constants"
local amun = amun

local Robot, RobotMt = (require "../base/class")("Robot")

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
-- @field lastResponseTime number - strategy time when the last radio response was handled *
-- @field radioResponse table - response from the robot, only set if there is a current response *
-- @field userControl table - command from input devices (fields: speed, omega, kickStyle, kickPower, dribblerSpeed) *
Robot.constants = {
	hasBallDistance = 0.04, -- 4 cm, robots where the balls distance to the dribbler is less than 2cm are considered to have the ball [m]
	passSpeed = 1.5, -- speed with which the ball should arrive at the pass target  [m/s]
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
		self.dribblerWidth = 0.07 --just a good default guess
		self.shootRadius = math.sqrt(self.radius^2 - (self.dribblerWidth/2)^2)
		self.id = data
		self.maxSpeed = 1 -- Init max speed and acceleration for opponents
		self.maxAcceleration = 1
	end
	self.lostSince = 0
	self.lastResponseTime = 0
	self.isFriendly = isFriendly
	self._hasBall = {}
	if self.isFriendly then -- setup trajectory and path objects
		self.trajectory = Trajectory(self)
		self.path = path.create()
		self.path:setBoundary(
			-geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
			-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
			 geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
			 geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02)
	end
	self._currentTime = 0
	self._controllerInput = nil
	self._kickStyle = nil
	self._kickPower = nil
	self._dribblerSpeed = nil
	self._standbyTimer = nil
	self._standby = nil
	self._standbyTick = nil
	self._standbyEnd = nil
	self.radioResponse = nil
	self.isVisible = nil
	self.pos = nil
	self.dir = nil
	self.speed = nil
	self.angularSpeed = nil
	self.userControl = nil
end

function Robot:tostring()
	if not self.pos or not self.id then
		return string.format("Robot(%s)", self.id and tostring(self.id) or "?")
	end
	return string.format("Robot(%d, pos%s)", self.id, tostring(self.pos))
end

RobotMt.__tostring = Robot.tostring

-- reset robot commands and update data
function Robot:_update(state, time, radioResponses)
	-- keep current time for use by setStandby
	self._currentTime = time
 	-- bypass override check in setControllerInput
	self._controllerInput = {} -- halt robot by default
	self:shootDisable() -- disable shoot
	self:setDribblerSpeed(nil) -- stop dribbler
	self:setStandby(nil) -- activate robot

	if radioResponses and #radioResponses > 0 then
		-- only keep the last and most current radio response
		self.radioResponse = radioResponses[#radioResponses]
		self.lastResponseTime = time
	else
		-- clear reponse field if response is missing
		self.radioResponse = nil
	end

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

function Robot:_updateUserControl(command)
	if not command then
		self.userControl = nil
		return
	end

	local v = Vector(command.v_s, command.v_f)
	local omega = command.omega
	if command.direct then
		-- correctly align local and strategy coordinate system
		v = v:rotate(self.dir - math.pi/2)
	else
		-- global to strategy coordinate mapping
		v = Coordinates.toLocal(v)
	end
	self.userControl = { speed = v, omega = omega,
		kickStyle = command.kick_style, kickPower = command.kick_power,
		dribblerSpeed = command.dribbler }
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
		self.acceleration.aSpeedupFMax = specs.acceleration.a_speedup_f_max or 1.0
		self.acceleration.aSpeedupSMax = specs.acceleration.a_speedup_s_max or 1.0
		self.acceleration.aSpeedupPhiMax = specs.acceleration.a_speedup_phi_max or 1.0
		self.acceleration.aBrakeFMax = specs.acceleration.a_brake_f_max or 1.0
		self.acceleration.aBrakeSMax = specs.acceleration.a_brake_s_max or 1.0
		self.acceleration.aBrakePhiMax = specs.acceleration.a_brake_phi_max or 1.0

		self.maxAcceleration = specs.acceleration.a_speedup_f_max or 1.0
	end
end

function Robot:_setCommand()
	amun.setCommand(self.generation, self.id, {
		controller = self._controllerInput,
		v_f = self._controllerInput and self._controllerInput.v_f,
		v_s = self._controllerInput and self._controllerInput.v_s,
		kick_style = self._kickStyle,
		kick_power = self._kickPower,
		dribbler = self._dribblerSpeed,
		standby = self._standby
	})
end

--- Set output from trajectory planing on robot
-- The robot is halted by default if no command is set for it. To tell a robot to follow its old trajectory call robot:setControllerInput(nil)
-- @param input Spline - Target points for the controller, in global coordinates!
function Robot:setControllerInput(input)
	-- Forbid overriding controller input except with halt
	if input and input.spline and (not self._controllerInput or self._controllerInput.spline) then
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
function Robot:setStandby(standby, noDelay)
	if not standby then
		-- delay deleting the standby timer
		if not self._standbyTick then
			self._standbyTimer = nil
		end
		self._standby = nil
	else
		-- start timer
		if not self._standbyTimer then
			self._standbyTimer = self._currentTime
		end
		if self._currentTime - self._standbyTimer > 30 or noDelay then
			-- log when standby was enabled
			if not self._standbyStart or not self._standby then
				self._standbyEnd = self._currentTime
			end
			self._standby = true
		end
	end
	self._standbyTick = standby
end

function Robot:isCharged()
	-- assume that recently invisble robots are not charged
	if self._currentTime - self.lostSince < 3 then
		return false
	-- robot is discharged during standby
	elseif self._standbyEnd and self._currentTime - self._standbyEnd < 5 then
		return false
	end
	return true
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
function Robot:calculateShootSpeed(destSpeed, distance)
	if destSpeed >= self.maxShotLinear then
		return self.maxShotLinear
	end

	local fastBallBrake = Constants.fastBallDeceleration
	local slowBallBrake = Constants.ballDeceleration
	local ballSwitchRatio = Constants.ballSwitchRatio

	-- solve(v_0+a_f*t_end=v_d, t_end);
	-- solve(integrate(v_0+t*a_f,t, 0, t_end)=d,v_0);
	local v_fast = math.sqrt(destSpeed * destSpeed - 2 * fastBallBrake * distance)

	if v_fast < self.maxShotLinear and v_fast * ballSwitchRatio < destSpeed then
		return v_fast
	end

	-- solve(v_0*switch=v_0+a_f*t_mid, t_mid);
	-- solve(v_0+a_f*t_mid+a_s*(t_end-t_mid)=v_d, t_end);
	-- solve(integrate(v_0+a_f*t,t,0,t_mid)+integrate(v_0+a_f*t_mid+a_s*(t-t_mid),t,t_mid,t_end)=d, v_0);
	local a_s = slowBallBrake
	local a_f = fastBallBrake
	local switch = ballSwitchRatio
	local d = distance
	local v_d = destSpeed
	local v_0 = math.sqrt((2*a_f*a_s*d)/(a_s*switch*switch-a_f*switch*switch-a_s)
		-(a_f*v_d*v_d)/(a_s*switch*switch-a_f*switch*switch-a_s))

	if not v_0 then
		return self.maxShotLinear
	else
		return v_0
	end
end

--- Shoot function wrapper.
-- Calls Robot:_shoot with distance adapted speed
-- @param destSpeed number - Ball speed at destination [m/s]
-- @param distance number - Distance to shoot [m]
function Robot:shoot(destSpeed, distance)
	local speed = self:calculateShootSpeed(destSpeed, distance)
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

--- Check whether the robot has the given ball.
-- Checks whether the ball is in rectangle in front of the dribbler with hasBallDistance depth. Uses hysteresis for the left and right side of that rectangle
-- @param ball Ball - ball object to check
-- @param [sideOffset number - extends the hasBall area sidewards]
-- @return boolean - has ball
function Robot:hasBall(ball, sideOffset)
	sideOffset = sideOffset or 0
	local relpos = self:posToBall(ball)
	local offset = math.abs(relpos.y)
	-- if too far to the sides
	if offset > self.dribblerWidth / 2 + sideOffset then
		return false
	-- in hysteresis area without having had the ball
	elseif offset >= self.dribblerWidth / 2 - 2*Constants.positionError + sideOffset
			and not self._hasBall[sideOffset] then
		return false
	end

	-- FIXME remove partial system latency hack
	self._hasBall[sideOffset] = relpos.x > -self.shootRadius
			and relpos.x < self.constants.hasBallDistance + ball.speed:length() * Constants.systemLatency
	return self._hasBall[sideOffset]
end

return Robot
