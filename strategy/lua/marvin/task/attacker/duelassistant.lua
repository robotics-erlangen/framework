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

local SuggestPass = require "task/ability/suggestpass"
local DuelAssistant = Class("Task.DuelAssistant", require "task/base", SuggestPass)

local math = require "../base/math"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function DuelAssistant:_init()
	self._duelist = nil
	self._opponent = nil
	self:_update()
	self._hyst = 0
	assert(self._duelist and self._opponent, "there is no duel to assist")
end

function DuelAssistant:_update()
	local duelist, opponent = next(self._inbox.defendedOpponent())
	self._duelist = duelist or self._duelist
	self._opponent = opponent or self._opponent
end

local HYSTERESIS_DISTANCE = 0.3
function DuelAssistant:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, {inbox = self._inbox})
	self:_update()
	local angleOffset = math.pi / 2
	local ballPos = World.Ball.pos
	if math.abs(ballPos.x) > self._hyst then
		self._hyst = HYSTERESIS_DISTANCE
		local sign = ballPos.x > 0 and 1 or -1
		angleOffset = sign * (math.pi / 2)
	end
	local friendlyPos = self._duelist.pos
	local opponentPos = self._opponent.pos
	local duelVector = opponentPos - friendlyPos
	local totalOffset = duelVector:complexMultiplication(Vector.fromAngle(angleOffset)):setLength(3 * self._robot.radius)
	local pos = friendlyPos + totalOffset
	local viewDir = duelVector:angle()
	self:_suggestPassRobotPosition(pos + duelVector)
	self._robot.trajectory:update(ToTarget, pos, viewDir)
end

return DuelAssistant
