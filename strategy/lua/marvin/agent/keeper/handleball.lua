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
local HandleBall = Class("Agent.Keeper.HandleBall", Base)

local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local AggressiveKeeper = require "task/keeper/aggressivekeeper"
local Keeper = require "task/keeper/keeper"
local KeeperChipAway = require "task/keeper/chipaway"
local Pass = require "task/shared/pass"
local Attack = require "util/attack"

function HandleBall:_init()
	self._pass = nil
	self._hysteresis = false
end

function HandleBall:behindCenterbacks(object)
	local hyst = self._hysteresis and 0.1 or 0
	local defenseDistance = self._robot.radius + self._robot.shootRadius + hyst
	return Field.distanceToFriendlyDefenseArea(object.pos, object.radius) < defenseDistance
end

function HandleBall:check()
	if Referee.isStopState() or Referee.isOpponentPenaltyState() or World.GameStage == "PenaltyShootout" then
		return false
	end
	-- if a slow ball enters the defense area
	local active = self:behindCenterbacks(World.Ball) and Ball.isSlowBall()
	if active then
		-- force being mainAttacker
		self._hysteresis = true
		self:_applyForMainAttacker(nil, nil, 2)
	else
		self._hysteresis = false
	end

	local mainAttackerFlag = self._inbox.mainAttacker().trainer == self._robot
	return mainAttackerFlag
end

function HandleBall:_updateTask()
	local endPos = Physics.ballAtTime(World.Ball, math.huge).pos
	local startInside = Field.isInFriendlyDefenseArea(World.Ball.pos, -World.Ball.radius-self._robot.radius)
	local endInside = Field.isInFriendlyDefenseArea(endPos, -World.Ball.radius-self._robot.radius)

	-- check if there is a danger of a own goal
	local ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	local robotDist = Field.distanceToFriendlyGoalLine(self._robot.pos, 0)
	local ballBehindKeeper = ballDist < robotDist

	if startInside and endPos.y < World.Geometry.FriendlyGoal.y + 0.01 then
		-- if ball is inside defense area and will enter the goal -> block the ball
		return Keeper
	elseif startInside and endInside and not ballBehindKeeper and self._inbox.passSuggestion() then
		-- if ball is inside defense area and will not leave it -> we have time to act
		-- try to find a good pass
		self._pass = Attack.choosePassFromSuggestions(self._robot, self._inbox.passSuggestion(), self._pass and self._pass.ballPos, false)
		if self._pass then --check if there is a good pass, else chip away
			return Pass, { self._pass.target, self._pass.ballPos, true }
		else
			return KeeperChipAway
		end
	else
		-- if inside and ball will leave or outside -> get rid of the ball
		return AggressiveKeeper
	end
end

return HandleBall
