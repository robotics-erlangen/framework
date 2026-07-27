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
local MidfieldSampling = require "task/ability/midfieldsampling"
local Midfield = Class("Task.Midfield", require "task/base", SuggestPass, MidfieldSampling)

local Physics = require "observer/physics"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

function Midfield:_init()
	self._passPos = nil

	-- ewwwww hack
	self._frameCount = 0

	local ignore = false
	self._obstacleTable = {
		ignoreBall = ignore,
		ignoreGoals = ignore,
		ignoreDefenseArea = ignore,
		ignoreOpponentDefenseArea = ignore,
		inbox = self._inbox,
		ignorePass = (not self._inbox) or ignore,
		ignoreBallPlacementObstacle = false
	}
end

function Midfield:_samplePassPosition()
	local zone = self._inbox.midfieldZone().trainer

	local left = zone.boundaries.left
	local right = zone.boundaries.right
	local top = zone.boundaries.top
	local bottom = zone.boundaries.bottom

	local width = right - left
	local height = top - bottom

	local xStep = width / 3
	local yStep = height / 6

	local bestScore = -math.huge
	local bestPoint = nil
	for x = left, left + width, xStep do
		for y = bottom, bottom + height, yStep do
			local candidatePoint = Vector(x, y)
			local rating = self:evalLocation(candidatePoint, bestScore)
			if rating > bestScore then
				bestScore = rating
				bestPoint = candidatePoint
			end
		end
	end

	return bestPoint
end

-- local disco = {
-- 	vis.colors.red,
-- 	vis.colors.blue,
-- 	vis.colors.green,
-- 	vis.colors.pink,
-- 	vis.colors.turquoise,
-- 	vis.colors.yellow,
-- 	vis.colors.skyBlue,
-- 	vis.colors.mediumPurple
-- }

function Midfield:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	self:precalculate()

	-- Hacky quickfix for messaging delay problems
	if (self._frameCount % 2) == 0 then
		self._passPos = self:_samplePassPosition()
	end
	self._frameCount = self._frameCount + 1

	-- local random = math.round(math.random() * #disco)
	-- vis.addCircle("middy", self._robot.pos, 0.1, disco[random] or vis.colors.orange, true)

	local zone = self._inbox.midfieldZone().trainer
	local defaultPos = zone.defaultPos

	local _, attackPosition = next(self._inbox.attackPosition())

	local time = Physics.robotTimeToPos(self._robot, self._passPos, Vector(0, 0))
	if self._passPos then
		self:_suggestPass(self._passPos, attackPosition, time)
	end
	
	self._robot.trajectory:update(ToTarget, defaultPos, math.pi/2, nil, Vector(0, 0))
end


return Midfield
