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

local SuggestPass = {}

local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"

function SuggestPass:_suggestPass(destBallPos, attackPos, relativeTime, anonymous, chip)
	-- check for mainAttacker
	local mainAttacker = self._inbox.mainAttacker().trainer
	if not mainAttacker then
		return
	end

	local currentBallPos = attackPos or World.Ball.pos
	local robotPos = destBallPos + (destBallPos - currentBallPos):setLength(self._robot.shootRadius + World.Ball.radius)

	-- calculate receive time
	local extraTime = 0.0
	local moveTime = relativeTime or Physics.robotTimeToPos(self._robot, robotPos, Vector(0, 0)) + extraTime
	local receiveTime = World.Time + moveTime

	vis.addCircle("t/a/suggestpass: passSuggestion", robotPos, 0.1, vis.colors.redHalf, true)
	vis.addCircle("t/a/suggestpass: passSuggestion", destBallPos, World.Ball.radius, vis.colors.redHalf, true)

	anonymous = anonymous or false
	self._send.passSuggestion("all",
		{ ballPos = destBallPos, time = receiveTime , anonymous = anonymous, chip = chip})
end

function SuggestPass:_suggestPassRobotPosition(destRobotPos, attackPos, relativeTime, anonymous)
	local currentBallPos = attackPos or World.Ball.pos
	local destBallPos = destRobotPos + (currentBallPos - destRobotPos):setLength(self._robot.shootRadius + World.Ball.radius)
	self:_suggestPass(destBallPos, attackPos, relativeTime, anonymous)
end

return SuggestPass
