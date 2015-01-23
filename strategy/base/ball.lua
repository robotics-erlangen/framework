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

local Coordinates = require "../base/coordinates"
local Ball, BallMt = (require "../base/class")("Ball")
local Constants = require "../base/constants"

--- Values provided by Ball
-- @class table
-- @name Ball
-- @field pos Vector - Current ball position
-- @field speed Vector - Movement direction, length is speed in m/s
-- @field radius number - Ball radius
-- @field deceleration Vector - Current deceleration that is assumed to brake the ball
-- @field brakeTime number - Time in seconds until the ball stops moving
-- @field lostSince number - Time when the ball was lost. Only has meaning when Ball isn't visible

function BallMt:__tostring()
	return string.format("Ball(pos = (%6.3f, %6.3f), speed = %3.1f)",
		self.pos.x, self.pos.y, self.speed:length())
end

--- Initializes a new ball, must only be called by world!
function Ball:init()
	self.radius = 0.0215
	self._isVisible = false
	self.lostSince = 0
	self.pos = Vector.createReadOnly(0, 0)
	self.speed = Vector.createReadOnly(0, 0)
	self.deceleration = Vector.createReadOnly(0, 0)
	self.brakeTime = 0
end

-- Processes ball information from amun, passed by world
function Ball:_update(data, time)
	-- if no ball data is available then no ball was tracked
	if not data then
		-- set lost timer
		if self._isVisible ~= false then
			self._isVisible = false
			self.lostSince = time
		end
		return
	end
	self._isVisible = true
	-- data from amun is in global coordiantes
	self.pos = Coordinates.toLocal(Vector.createReadOnly(data.p_x, data.p_y))
	self.speed = Coordinates.toLocal(Vector.createReadOnly(data.v_x, data.v_y))

	 -- if ball is too slow then it's movement direction isn't exact enough to be used for prediction the ball
	if self.speed:length() < 0.05 then
		self.deceleration = Vector.createReadOnly(0, 0)
		self.brakeTime = 0
	else
		local ballDeceleration = Constants.ballDeceleration -- negative value
		self.deceleration = self.speed:copy():setLength(ballDeceleration)
		-- time until the ball stops, assuming a linear decrease of velocity
		-- |v| - |a| * t = 0
		self.brakeTime = self.speed:length()/-ballDeceleration
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
