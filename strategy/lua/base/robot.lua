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

local Robot = (require "../base/class")("Robot")

local Constants = require "../base/constants"
local Coordinates = require "../base/coordinates"
local path = require "../base/path"
local Trajectory = require "../base/trajectory"
local vis = require "../base/vis"


--- Values provided by a robot object.
--- Fields marked with * are only available for own robots
-- @class table
-- @name Robot
-- @field constants table - robot specific constants *(empty for opponents)
-- @field id number - robot id
-- @field generation number - robot generation (-1 for unknown robots)
-- @field year number - year robot was built in *
-- @field pos Vector - current position
-- @field dir number - current direction faced
-- @field isFriendly bool - true if own robot
-- @field speed Vector - current speed (movement direction doesn't have to match with dir)
-- @field angularSpeed number - rotation speed of the robot
-- @field isVisible bool - True if robot is tracked
-- @field radius number - the robot's radius (defaults to 0.09m)
-- @field height number - the robot's height *
-- @field shootRadius number
-- @field dribblerWidth number - Width of the dribbler
-- @field maxSpeed number - maximum speed
-- @field maxAngularSpeed number - maximum angular speed
-- @field acceleration table - Acceleration and deceleration parameters: aSpeedupFMax, aSpeedupSMax, aSpeedupPhiMax, aBrakeFMax, aBrakeSMax, aBrakePhiMax
-- @field lastResponseTime number - strategy time when the last radio response was handled *
-- @field radioResponse table - response from the robot, only set if there is a current response *
-- @field userControl table - command from input devices (fields: speed, omega, kickStyle, kickPower, dribblerSpeed) *
-- @field moveCommand table - command used when robots are dragged with the mouse (fields: time, pos (global)) * (optional)
-- @field prevMoveTo Vector - moveTo from previous trajectory call or nil
Robot.constants = {
	hasBallDistance = 0.04, -- 4 cm, robots where the balls distance to the dribbler is less than 2cm are considered to have the ball [m]
	passSpeed = 3, -- speed with which the ball should arrive at the pass target  [m/s]
	shootDriveSpeed = 0.2, -- how fast the shoot task drives at the ball [m/s]
	minAngleError = 4/180 * math.pi -- minimal angular precision that the shoot task guarantees [in radians]
}
Robot.ALLY_GENERATION_ID = 9999
Robot.GENERATION_2014_ID = 3
Robot.GENERATION_2020_ID = 4

--- Creates a new robot object.
-- Init function must be called for EVERY robot.
-- @param data table/number - data from amun.getTeam or robot id for opponents
-- @param isFriendly boolean - true if own robot
function Robot:init(data, isFriendly)
	if type(data) == "table" then
		self:_setSpecs(data)
	else
		self.radius = 0.09 -- set default radius if no specs are available
		self.dribblerWidth = 0.07 --just a good default guess
		self.shootRadius = 0.067 -- shoot radius of 2014 generation
		self.generation = -1
		self.id = data
		self.maxSpeed = 3.5 -- Init max speed and acceleration for opponents
		self.maxAngularSpeed = 12
		self.maxShotLinear = 6.5

		self.acceleration = {}
		self.acceleration.aSpeedupFMax = 3.75
		self.acceleration.aSpeedupSMax = 4.5
		self.acceleration.aSpeedupPhiMax = 41.5
		self.acceleration.aBrakeFMax = 5.75
		self.acceleration.aBrakeSMax = 4
		self.acceleration.aBrakePhiMax = 21.5
	end
	self.lostSince = 0
	self.lastResponseTime = 0
	self.isFriendly = isFriendly
	self._hasBall = {}
	if self.isFriendly then -- setup trajectory and path objects
		self.trajectory = Trajectory(self)
		self.path = path.create(self.id)
	end
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
end

function Robot:__tostring()
	if self._toStringCache ~= "" then
		return self._toStringCache
	end
	if not self.pos or not self.id then
		self._toStringCache = string.format("Robot(%s)", self.id and tostring(self.id) or "?")
	else
		self._toStringCache = string.format("Robot(%d, pos%s)", self.id, tostring(self.pos))
	end
	return self._toStringCache
end

-- reset robot commands and update data
function Robot:_update(state, time, radioResponses)
	-- keep current time for use by setStandby
	self._currentTime = time
	-- bypass override check in setControllerInput
	self._controllerInput = {} -- halt robot by default
	self:shootDisable() -- disable shoot
	self:setDribblerSpeed(0) -- stop dribbler
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

	self._toStringCache = ""
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
	if command["local"] then
		-- correctly align local and strategy coordinate system
		-- self.dir can be nil if robot was not yet visible
		local dir = self.isVisible and self.dir or math.pi/2
		v = v:rotate(dir - math.pi/2)
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
	if specs.shoot_radius then
		self.shootRadius = specs.shoot_radius
	elseif specs.angle then -- calculate shoot radius
		self.shootRadius = self.radius * math.cos(specs.angle / 2) - 0.005
	else
		self.shootRadius = self.radius
	end
	if specs.dribbler_width then
		self.dribblerWidth = specs.dribbler_width
	else -- estimate dribbler width
		self.dribblerWidth = 2 * math.sqrt(self.radius^2 - self.shootRadius^2)
	end
	self.maxSpeed = specs.v_max or 2
	self.maxAngularSpeed = specs.omega_max or 5
	self.maxShotLinear = specs.shot_linear_max or 8 -- TODO: 6.5????
	self.maxShotChip = specs.shot_chip_max or 3
	self.acceleration = {}
	local accelData = specs.strategy or {}
	self.acceleration.aSpeedupFMax = accelData.a_speedup_f_max or 1.0
	self.acceleration.aSpeedupSMax = accelData.a_speedup_s_max or 1.0
	self.acceleration.aSpeedupPhiMax = accelData.a_speedup_phi_max or 1.0
	self.acceleration.aBrakeFMax = accelData.a_brake_f_max or 1.0
	self.acceleration.aBrakeSMax = accelData.a_brake_s_max or 1.0
	self.acceleration.aBrakePhiMax = accelData.a_brake_phi_max or 1.0
end

function Robot:_updatePathBoundaries(geometry, aoi)
	if aoi ~= nil then
		self.path:setBoundary(aoi.x1, aoi.y1, aoi.x2, aoi.y2)
	else
		self.path:setBoundary(
			-geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
			-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
			 geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
			 geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02)
	end
end

function Robot:_command()
	local STANDBY_DELAY = 30
	local standby = self._standbyTimer >= 0 and (self._currentTime - self._standbyTimer > STANDBY_DELAY)

	return {
		controller = self._controllerInput,
		v_f = self._controllerInput and self._controllerInput.v_f,
		v_s = self._controllerInput and self._controllerInput.v_s,
		omega = self._controllerInput and self._controllerInput.omega,
		kick_style = self._kickStyle or nil,
		kick_power = self._kickPower > 0 and self._kickPower or nil,
		force_kick = self._forceKick,
		dribbler = self._dribblerSpeed,
		standby = standby
	}
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
	self._kickStyle = false
	self._kickPower = 0
	self._forceKick = false
end

--- Enable linear kick.
-- The different kick styles are exclusive, that is only one of them can be active at a time.
-- @param speed number - Shoot speed [m/s]
-- @param ignoreLimit bool - Don't enforce shoot speed limit, if true
function Robot:shoot(speed, ignoreLimit)
	if not ignoreLimit then
		speed = math.min(Constants.maxBallSpeed, speed)
	end
	speed = math.bound(0.05, speed, self.maxShotLinear)
	self._kickStyle = "Linear"
	self._kickPower = speed
	vis.addCircle("shoot command", self.pos, self.radius + 0.04, vis.colors.mediumPurple, nil, nil, nil, 0.03)
end

--- Enable chip kick.
-- The different kick styles are exclusive, that is only one of them can be active at a time.
-- @param distance number - Chip distance [m]
function Robot:chip(distance)
	distance = math.bound(0.05, distance, self.maxShotChip)
	self._kickStyle = "Chip"
	self._kickPower = distance
	vis.addCircle("shoot command", self.pos, self.radius + 0.04, vis.colors.darkPurple, nil, nil, nil, 0.03)
end

--- Force the robot to shoot even if the IR isn't triggered
function Robot:forceShoot()
	self._forceKick = true
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
-- @param standby boolean - enable standby for robot if true
function Robot:setStandby(standby)
	if standby then
		-- start timer
		if self._standbyTimer < 0 then
			self._standbyTimer = self._currentTime
		end
		self._standbyTick = true
	else
		-- disable standby if disabled two times in a row
		if not self._standbyTick then
			self._standbyTimer = -1
		end
		self._standbyTick = false
	end
end

--- Calculate shoot speed neccessary for linear shoot to reach the target with a certain speed.
-- This is limited to maxShootLinear and maxBallSpeed.
-- @param destSpeed number - Ball speed at destination [m/s]
-- @param distance number - Distance to chip [m]
-- @param ignoreLimit bool - Don't enforce rule given shoot speed limit, if true
-- @return number - Speed to shoot with [m/s]
function Robot:calculateShootSpeed(destSpeed, distance, ignoreLimit)
	local maxShot = ignoreLimit and self.maxShotLinear or math.min(self.maxShotLinear, Constants.maxBallSpeed)
	if destSpeed >= maxShot then
		return maxShot
	end

	local fastBallBrake = Constants.fastBallDeceleration
	local slowBallBrake = Constants.ballDeceleration
	local ballSwitchRatio = Constants.ballSwitchRatio

	-- solve(v_0+a_f*t_end=v_d, t_end);
	-- solve(integrate(v_0+t*a_f,t, 0, t_end)=d,v_0);
	local v_fast = math.sqrt(destSpeed * destSpeed - 2 * fastBallBrake * distance)

	if v_fast < maxShot and v_fast * ballSwitchRatio < destSpeed then
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
	local v_0 = math.sqrt( a_f*(2*a_s*d - v_d*v_d) / ((a_s - a_f)*switch*switch - a_s))

	if v_0 > maxShot then
		return maxShot
	else
		return v_0
	end
end

--- Check whether the robot has the given ball.
-- Checks whether the ball is in rectangle in front of the dribbler with hasBallDistance depth. Uses hysteresis for the left and right side of that rectangle
-- @param ball Ball - must be World.Ball to make sure hysteresis will work
-- @param [sideOffset number - extends the hasBall area sidewards]
-- @return boolean - has ball
function Robot:hasBall(ball, sideOffset, manualHasBallDistance)
	sideOffset = sideOffset or 0
	local hasBallDistance = (manualHasBallDistance or self.constants.hasBallDistance)

	-- handle sidewards balls, add extra time for strategy timing jitter
	local latencyCompensation = (ball.speed - self.speed):scaleLength(Constants.systemLatency + 0.03)
	local lclen = latencyCompensation:length()

	-- fast fail
	local approxMaxDist = lclen + hasBallDistance + self.shootRadius + ball.radius + self.dribblerWidth / 2 + sideOffset
	if ball.pos:distanceToSq(self.pos) > approxMaxDist * approxMaxDist then
		-- reset hystersis
		self._hasBall[sideOffset] = false
		return false
	end

	-- interpolate vector used for correction to circumvent noise
	local MIN_COMPENSATION = 0.005
	local BOUND_COMPENSATION_ANGLE = 70/180*math.pi
	if lclen < MIN_COMPENSATION then
		latencyCompensation = Vector(0, 0)
	elseif lclen < 2*MIN_COMPENSATION then
		local scale = (lclen - MIN_COMPENSATION) / MIN_COMPENSATION
		latencyCompensation:scaleLength(scale)
	end
	-- local coordinate system
	latencyCompensation = latencyCompensation:rotate(-self.dir)
	-- let the vector point away from the robot
	if latencyCompensation.x < 0 then
		latencyCompensation:scaleLength(-1)
	end
	-- bound angle
	lclen = latencyCompensation:length()
	if lclen > 0.001 and math.abs(latencyCompensation:angle()) > BOUND_COMPENSATION_ANGLE then
		local boundAngle = math.bound(-BOUND_COMPENSATION_ANGLE, latencyCompensation:angle(), BOUND_COMPENSATION_ANGLE)
		latencyCompensation = Vector.fromAngle(boundAngle):scaleLength(lclen)
	end

	-- add hasBallDistance
	if lclen <= 0.001 then
		latencyCompensation = Vector(hasBallDistance, 0)
	else
		latencyCompensation = latencyCompensation:setLength(lclen + hasBallDistance)
	end

	-- Ball position relative to dribbler mid
	local relpos = (ball.pos - self.pos):rotate(-self.dir)
	relpos.x = relpos.x - self.shootRadius - ball.radius
	-- calculate position on the dribbler that would have been hit
	local offset = math.abs(relpos.y - relpos.x * latencyCompensation.y / latencyCompensation.x)
	-- local debug = require "../base/debug"
	-- debug.set("latencyCompensation", latencyCompensation)
	-- debug.set("offset", offset)

	-- if too far to the sides
	if offset > self.dribblerWidth / 2 + sideOffset then
		-- reset hystersis
		self._hasBall[sideOffset] = false
		return false
	-- in hysteresis area without having had the ball
	elseif offset >= self.dribblerWidth / 2 - 2*Constants.positionError + sideOffset
			and not self._hasBall[sideOffset] then
		return false
	end

	self._hasBall[sideOffset] = relpos.x > self.shootRadius * (-1.5)
			and relpos.x < latencyCompensation.x and ball.posZ < Constants.maxRobotHeight*1.2 --*1.2 to compensate for vision error
	return self._hasBall[sideOffset]
end

return Robot
