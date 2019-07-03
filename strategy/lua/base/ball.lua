--[[
--- Ball class.
module "Ball"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
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

local Ball = (require "../base/class")("Ball")

local Constants = require "../base/constants"
local Coordinates = require "../base/coordinates"
local plot = require "../base/plot"


--- Values provided by Ball
-- @class table
-- @name Ball
-- @field pos Vector - Current ball position
-- @field posZ number - Ball height above the field
-- @field speed Vector - Movement direction, length is speed in m/s
-- @field speedZ number - Upwards speed in m/s
-- @field radius number - Ball radius
-- @field deceleration Vector - Current deceleration that is assumed to brake the ball
-- @field brakeTime number - Time in seconds until the ball stops moving
-- @field lostSince number - Time when the ball was lost. Only has meaning when Ball isn't visible

local BALL_QUALITY_FILTER_FACTOR = 0.05
--- Initializes a new ball, must only be called by world!
function Ball:init()
	self.radius = 0.0215
	self._isVisible = false
	self.lostSince = 0
	self.pos = Vector.createReadOnly(0, 0)
	self.speed = Vector.createReadOnly(0, 0)
	self.posZ = 0
	self.speedZ = 0
	self.deceleration = 0
	self.maxSpeed = 0
	self.initSpeedZ = 0
	self.touchdownPos = nil
	self.isBouncing = false
	self.framesDecelerating = math.huge
	self.detectionQuality = 0.6 -- 0.6 is the largest value that can be reached with 60 fps cameras(?)
	self.hasRawData = false
	self._hadRawData = false -- used for detecting old simulator logs with no recoded ball raw data
	self.rawPositions = {}
end

function Ball:__tostring()
	return string.format("Ball(pos = (%6.3f, %6.3f), speed = %3.1f)",
		self.pos.x, self.pos.y, self.speed:length())
end

function Ball:_updateLostBall(time)
	-- set lost timer
	if self._isVisible then
		self._isVisible = false
		self.lostSince = time
	end
	if self._hadRawData then
		self.detectionQuality = self.detectionQuality * (1 - BALL_QUALITY_FILTER_FACTOR) -- only reduce quality if ball raw data exists
	end
end

-- Processes ball information from amun, passed by world
function Ball:_update(data, time)
	self.hasRawData = false
	-- WARNING: this is the quality BEFORE the frame
	plot.addPlot("Ball.quality", self.detectionQuality)
	-- if no ball data is available then no ball was tracked
	if not data then
		self:_updateLostBall(time)
		return
	end

	-- check if the ball pos or speed are invalid (might result from tracking) -> then ignore the update
	local nextPos = Coordinates.toLocal(Vector.createReadOnly(data.p_x, data.p_y))
	local nextSpeed = Coordinates.toLocal(Vector.createReadOnly(data.v_x, data.v_y))
	local SIZE_LIMIT = 1000
	if nextPos:isNan() or nextSpeed:isNan() or math.abs(nextPos.x) > SIZE_LIMIT or
		math.abs(nextPos.y) > SIZE_LIMIT or math.abs(nextSpeed.x) > SIZE_LIMIT or math.abs(nextSpeed.y) > SIZE_LIMIT then
		self:_updateLostBall(time)
		return
	end

	-- data from amun is in global coordiantes
	local lastSpeedLength = self.speed:length()
	self._isVisible = true
	self.pos = nextPos
	self.speed = nextSpeed
	self.posZ = data.p_z
	self.speedZ = data.v_z
	if data.touchdown_x and data.touchdown_y then
		self.touchdownPos = Coordinates.toLocal(Vector.createReadOnly(data.touchdown_x, data.touchdown_y))
	end
	self.isBouncing = data.is_bouncing

	self:_updateTrackedState(lastSpeedLength)

	self:_updateRawDetections(data.raw)
end

function Ball:_updateRawDetections(rawData)
	if not rawData or #rawData == 0 then
		return
	end
	local count = math.min(1, #rawData)
	self._hadRawData = true
	self.hasRawData = true
	self.detectionQuality = BALL_QUALITY_FILTER_FACTOR * count + (1 - BALL_QUALITY_FILTER_FACTOR) * self.detectionQuality

	self.rawPositions = {}
	for _, detection in ipairs(rawData) do
		local pos = Coordinates.toLocal(Vector.createReadOnly(detection.p_x, detection.p_y))
		table.insert(self.rawPositions, pos)
	end
end

function Ball:_updateTrackedState(lastSpeedLength)
	-- speed tracking
	-- framesDecelerating counts the number of frames since the last extreme acceleration
	-- so even if the ball slowly accelerates, framesDecelerating will not reset
	if self.speed:length() - lastSpeedLength > 0.2 then
		self.framesDecelerating = 0
	else
		self.framesDecelerating = self.framesDecelerating + 1
	end
	-- if the ball does not accelerate extremely for 3 frames straight, the current velocity
	-- is taken as the maximum ball speed
	if self.framesDecelerating == 3 then
		self.maxSpeed = self.speed:length()
	end
	if self.maxSpeed < self.speed:length() then
		self.maxSpeed = self.maxSpeed + 0.3 * (self.speed:length() - self.maxSpeed)
	end
	plot.addPlot("Ball.maxSpeed", self.maxSpeed);

	-- set the deceleration depending on the ball's state (sliding or rolling)
	if self.speed:length() > Constants.ballSwitchRatio * self.maxSpeed then
		self.deceleration = Constants.fastBallDeceleration
	else
		self.deceleration = Constants.ballDeceleration
	end
end

--- Checks whether the ball position is valid
-- @return boolean - True if ball is visible and position and speed are not NaN
function Ball:isPositionValid()
	if not self._isVisible then
		return false
	end
	return not self.pos:isNan() and not self.speed:isNan()
end

return Ball
