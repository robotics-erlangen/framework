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
local Keeper = Class("Agent.Keeper", Base)

local World = require "../base/world"
local Default = require "agent/keeper/default"
local HandleBall = require "agent/keeper/handleball"
local DefendPenaltyShootout = require "agent/keeper/defendpenaltyshootout"


Keeper._behaviors = {
	DefendPenaltyShootout,
	HandleBall,
	Default
}
function Keeper.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if robot == World.FriendlyKeeper then
			return robot
		end
	end
end

function Keeper:keepRobot()
	return self._robot.isVisible and self._robot == World.FriendlyKeeper and not self._robot.userControl
end

function Keeper:rateRobot()
	return 1
end

return Keeper
