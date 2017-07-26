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
	self._debugTable = {	startingPoint = self._passInfo.ballPos,
							ballPos = passInfo.ballPos,
							passBlocked = passBlocked, 
							line = line, cw = clockwise,
							cwDist = cwDist,
							cwRating = cwRating,
							ccw = counterClockwise,
							ccwDist = ccwDist,
							ccwRating = ccwRating,
							feintPos = self._feintPos}
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
	local groupApplication = { name = "striker", payload = {}}
	self._send.groupApplication("trainer", groupApplication)

	local _, attackPosition = next(self._inbox.attackPosition())
	if attackPosition then
		self:_suggestPass(self._passInfo.ballPos, attackPosition, self._passInfo.time)
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local dir = (World.Geometry.OpponentGoal - self._robot.pos):angle()
	self._robot.trajectory:update(ToTarget, self._feintPos, dir)
end

return SideStep
