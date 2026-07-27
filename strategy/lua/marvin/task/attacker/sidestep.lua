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
local SideStep = Class("Task.SideStep", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Rating = require "util/rating"
local Field = require "../base/field"
local World = require "../base/world"
local vis = require "../base/vis"
local debug = require "../base/debug"
local G = World.Geometry

local MANMARK_DISTANCE_THRESHOLD = 0.2

function SideStep:_projectBotsOnLine(point1, point2)
	local bestDist = math.huge
	for _, r in ipairs(World.OpponentRobots) do
		local dist = r.pos:distanceToLineSegment(point1, point2)
		if dist < bestDist then
			bestDist = dist
		end
	end
	return bestDist
end

function SideStep:_rateLine(line)
	local intersection, lambda = Field.nextAllowedFieldLineCut(self._passInfo.ballPos, line, self._robot.radius)
	if intersection then
		local rating = 1 - Rating.valueToRating(lambda, 2, 0)/2
		local dist = self:_projectBotsOnLine(self._passInfo.ballPos, self._passInfo.ballPos + line)
		local distRating = Rating.valueToRating(dist, 1, MANMARK_DISTANCE_THRESHOLD)

		rating = rating - (1 - distRating) / 10
		return lambda, rating
	else
		return 0, 0
	end
end

function SideStep:_init(passInfo)
	self._passInfo = passInfo
	self._feintPos = nil
	local passBlocked = self:_projectBotsOnLine(self._robot.pos, passInfo.ballPos) > MANMARK_DISTANCE_THRESHOLD
	local line
	if passBlocked then
		line = (passInfo.ballPos - World.Ball.pos):setLength(1)
	else
		line = (G.OpponentGoal - passInfo.ballPos):setLength(1)
	end
	local clockwise = line:copy():perpendicular()
	local counterClockwise = line:copy():rotate(math.pi / 2)
	local ccwDist, ccwRating = self:_rateLine(counterClockwise)
	local cwDist, cwRating = self:_rateLine(clockwise)
	if cwRating > ccwRating then
		self._feintPos = passInfo.ballPos + clockwise:setLength(cwDist)
	else
		self._feintPos = passInfo.ballPos + counterClockwise:setLength(ccwDist)
	end
	self._debugTable = {
		startingPoint = self._passInfo.ballPos,
		ballPos = passInfo.ballPos,
		passBlocked = passBlocked,
		line = line, cw = clockwise,
		cwDist = cwDist,
		cwRating = cwRating,
		ccw = counterClockwise,
		ccwDist = ccwDist,
		ccwRating = ccwRating,
		feintPos = self._feintPos
	}
end

local function draw(table)
	local t = table
	debug.push("sideStep Debug")
	for a, b in pairs(t) do
		debug.set(a, b)
	end
	debug.pop()
	vis.addCircle("sideStep", t.startingPoint, 0.05, vis.colors.blue, true)
	vis.addCircle("sideStep", t.feintPos, 0.05, vis.colors.red, true)
	vis.addPath("sideStep", {t.ballPos, t.ballPos + t.cw:setLength(t.cwDist)}, vis.fromTemperature(t.cwRating))
	vis.addPath("sideStep", {t.ballPos, t.ballPos + t.ccw:setLength(t.ccwDist)}, vis.fromTemperature(t.ccwRating))
end

function SideStep:run()
	draw(self._debugTable)
	if self._inbox.mainAttacker().trainer ~= self._robot then
		local groupApplication = { name = "striker", payload = {}}
		self._send.groupApplication("trainer", groupApplication)
	end

	local _, attackPosition = next(self._inbox.attackPosition())
	if attackPosition then
		self:_suggestPass(self._passInfo.ballPos, attackPosition, self._passInfo.time - World.Time)
	end

	local obstacleTable = {
		ignorePass = false,
		inbox = self._inbox
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	local viewPos = attackPosition or World.Geometry.OpponentGoal
	local dir = (viewPos - self._robot.pos):angle()
	self._robot.trajectory:update(ToTarget, self._feintPos, dir)
end

return SideStep
