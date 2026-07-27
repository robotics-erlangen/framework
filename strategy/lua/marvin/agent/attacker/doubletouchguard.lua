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

local Base = require "agent/base/behavior"
local DoubleTouchGuard = Class("Agent.Attacker.DoubleTouchGuard", Base)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local StopAttack = require "task/attacker/stopattack"


--prevents freekicking robot from moving away after failed shot
local lastFreekickTime = 1
function DoubleTouchGuard:check()
	if Referee.isFriendlyFreeKickState() then
		-- subtract half a second to ensure that the freekick shot gets detected
		lastFreekickTime = World.Time - 0.5
	end

	debug.push("DoubleTouchConditions")
	debug.set("ownStandardShooter", Robot.ownStandardShooter())
	debug.set("Last Freekick Time", lastFreekickTime)
	debug.set("wasShot Condition", not Ball.wasShot(World.Time - lastFreekickTime))
	debug.pop()

	if World.RefereeState == "Game" and Robot.ownStandardShooter() == self._robot and not Ball.wasShot(World.Time-lastFreekickTime) then
		return true
	end
	return false
end

function DoubleTouchGuard:_updateTask()
	return StopAttack, {0.15}
end

return DoubleTouchGuard
