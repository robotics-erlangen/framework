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
local Attacker = Class("Agent.Attacker", Base)

local World = require "../base/world"
local debug = require "../base/debug"

local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local Default = require "agent/attacker/default"
local Duel = require "agent/attacker/duel"
local DuelAssistant = require "agent/attacker/duelassistant"
local FreeKick = require "agent/attacker/freekick"
local Move = require "agent/attacker/move"
local PassTiming = require "agent/attacker/passtiming"
local Penalty = require "agent/attacker/penalty"
local PenaltyDefensive = require "agent/attacker/penaltydefensive"
local PenaltyPassive = require "agent/shared/penaltypassive"
local PenaltyShootout = require "agent/attacker/penaltyshootout"
local Shoot = require "agent/attacker/shoot"
local Stop = require "agent/attacker/stop"
local BallEscort = require "agent/shared/ballescort"
local DoubleTouchGuard = require "agent/attacker/doubletouchguard"
local RescueFromDefenseArea = require "agent/shared/rescuefromdefensearea"

Attacker._behaviors = {
	ApplyForMainattacker,
	RescueFromDefenseArea,
	Move,
	Stop,
	PenaltyShootout,
	PenaltyDefensive,
	PenaltyPassive,
	Penalty,
	FreeKick,
	DoubleTouchGuard,
	Duel,
	DuelAssistant,
	BallEscort,
	PassTiming,
	Shoot,
	Default
}

function Attacker:init(robot, messaging)
	Base.init(self, robot, messaging)
	self.beOffensive = false
end

function Attacker:_run()
	if self._activeBehavior then
		assert(self._activeBehavior._send, "behavior message interface changed")
		self._activeBehavior._send.attackerFlag("all")

		local groupApplication = { name = "moves", payload = {} }
		self._activeBehavior._send.groupApplication("trainer", groupApplication)
	end

	debug.set("pool rating", self:rateRobot())
end

function Attacker.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Attacker:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

-- worse rating if robot is farther away from opponent goal
function Attacker:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool()  then
		return math.huge
	end
	if self._inbox.mainAttacker().trainer == self._robot then
		return 0
	end
	return -World.Geometry.OpponentGoal:distanceTo(self._robot.pos)
end

return Attacker
