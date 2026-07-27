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

local Base = require "agent/base/agent"
local Defender = Class("Agent.Defender", Base)

local World = require "../base/world"

local Default = require "agent/defender/default"
local HandleBall = require "agent/defender/handleball"
local ManMark = require "agent/defender/manmark"
local ZoneDefense = require "agent/defender/zonedefense"
local Penalty = require "agent/defender/penalty"
local Piggy = require "agent/defender/piggy"
local BallEscort = require "agent/shared/ballescort"
local RescueFromDefenseArea = require "agent/shared/rescuefromdefensearea"

Defender._behaviors = {
	RescueFromDefenseArea,
	Penalty,
	BallEscort,
	HandleBall,
	ManMark,
	Piggy,
	ZoneDefense,
	Default
}

function Defender:_run()
	self._activeBehavior._send.defenderFlag("all")
end

function Defender.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Defender:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

-- worse rating if robot if farther away from own goal
function Defender:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool() then
		return math.huge
	end
	return -World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
end

return Defender
