--[[
--- Trajectory manager.
module "Trajectory"
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

local Class = require "../base/class"
local Trajectory = Class("Trajectory") -- Trajectory manager

local vis = require "../base/vis"
local Coordinates = require "../base/coordinates"


--- Initialises trajectory manager.
-- Must only be called by robot class!
-- @param robot Robot - robot to handle
function Trajectory:init(robot)
	self._robot = robot
	self._handler = nil
end

--- Update trajectory.
-- Resets handler if the trajectory type changes.
-- Values passed to and returned from the trajectory handler <strong>must</strong> use strategy coordinates. The handler is responsible for doing any neccessary conversions!
-- The handler has to return a protobuf.robot.Spline, Vector, number (controllerInput, moveDest, moveTime).
-- @param handlerType Table - must be a subclass of Trajectory.Base
-- @param ... any - passed on to trajectory handler
-- @return Vector, number - move destination and time as returned by the trajectory handler
function Trajectory:update(handlerType, ...)
	if not Class.instanceOf(handlerType, Trajectory.Base) then
		error("Trajectory module must derive from Trajectory.Base")
	end
	if not (self._handler and Class.instanceOf(self._handler, handlerType) and self._handler:canHandle(...)) then
		self._handler = handlerType(self._robot)
	end
	local splines, moveDest, moveTime = self._handler:update(...)

	local splin = splines.spline and splines.spline[1] or nil
	if splin then
		local xCalc = splin.x.a0+splin.x.a1*moveTime+splin.x.a2*moveTime/2
		local yCalc = splin.y.a0+splin.y.a1*moveTime+splin.y.a2*moveTime/2
		self._robot.prevMoveTo = Coordinates.toLocal(Vector(xCalc, yCalc))
	else
		self._robot.prevMoveTo = nil
	end
	self._robot:setControllerInput(splines)
	if self._robot.pos then
		vis.addPath("MoveTo", {self._robot.pos, moveDest}, vis.colors.whiteHalf)
		vis.addCircle("MoveTo", moveDest, self._robot.radius, vis.colors.yellowHalf, true)
	end
	return moveDest, moveTime
end


-- base class for trajectory planning
Trajectory.Base = (require "../base/class")("Trajectory.Base")

function Trajectory.Base:init(robot, ...)
	self._robot = robot
	self:_init(...)
end

-- disable unusued args warning for ...
-- luacheck: ignore 212/...
function Trajectory.Base:_init(...)
	error("stub")
end

-- Data has to be in strategy coordinates!!! The trajectory module is responsible for the conversion
-- between strategy and global coordinates!
-- New data to use for updating, returns controllerInput, moveDest and moveTime
function Trajectory.Base:update(...)
	error("Trajectory module not implemented")
	-- luacheck: ignore controllerInput moveDest moveTime
	return controllerInput, moveDest, moveTime
end

-- checks whether trajectory handler is currently able to handle the new data
-- or should be reseted
-- canHandle is guaranteed to be called only after update was called at least once
function Trajectory.Base:canHandle(...)
	error("Trajectory module not implemented")
end

return Trajectory
