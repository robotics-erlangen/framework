--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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

local Debug = {}


local DebugCommands = require "../base/debugcommands"
local World = require "../base/world"

--- moves the ball to a given position, using teleportation or ballPlacement.
--@name moveBall
--@param state String - the RefereeState that should be given as soon as the ball reaches the position
--@param target Vector - the position where the ball should be, defaults to World.BallPlacementPos to allow subsequent calls to this function without changing the target
--@param distanceTo number - the distance that is tolerable when placeing the ball, defaults to 0.05 [m]
--@param speed number - the speed that is tolerable when placeing the ball, defaults to 0.05 [m/s]
--@param offensive bool - if the placement should be given to the own team, defaults to false
--This function should be called every frame until the refereeState changes to state
function Debug.moveBall(state, target, distanceTo, speed, offensive)
	distanceTo = distanceTo or 0.05
	speed = speed or 0.05
	if not amun.isDebug then
		error("moveBall is only available during debug")
	end
	local placementState = "BallPlacement"
	if offensive then
		placementState = placementState .. "Offensive"
	else
		placementState = placementState .. "Defensive"
	end
	if World.IsSimulated then
		local ball = {pos = target, speed = Vector(0,0)}
		DebugCommands.moveObjects(ball)
		DebugCommands.sendRefereeCommand(state)
	elseif World.RefereeState ~= placementState or (target and target:distanceToSq(World.BallPlacementPos) < 0.05 * 0.05) then
		assert(target, "moveBall needs a target in the first run")
		DebugCommands.sendRefereeCommand(placementState, nil, nil, nil, target)
	end
	target = target or World.BallPlacementPos
	if World.Ball.pos:distanceToSq(target) < distanceTo * distanceTo and World.Ball.speed:lengthSq() < speed * speed then
		DebugCommands.sendRefereeCommand(state)
	end
end

return Debug
