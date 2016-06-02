local Shoot = require "task/ability/shoot"
local ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

local Ball = require "observer/ball"
local Goal = require "observer/goal"

local PathHelper = require "trajectory/pathhelper"

-- ====================================
-- ===== SHOOT TARGET CALCULATION =====
-- ====================================

-- updates self._robotList and self._robotListWithoutKeeper
-- all robot positions are extrapolated depending on the distance to self._robot
function ShootGoal:_updateRobotLists()
	-- cache it
	if self._robotListTimestamp == World.Time then
		return
	end
	self._robotListTimestamp = World.Time

	-- constant extrapolation time
	-- after this reaction time the robots tend to block the shot
	-- thus further extrapolation does not really make sense
	local extrapolationTime = 0.2
	local averageKickedBallSpeed = 6

	-- clear the lists
	self._robotList = {}
	self._robotListWithoutKeeper = {}

	-- consider all robots (also our ones)
	for _,r in ipairs(World.Robots) do
		if r ~= self._robot then
			-- crude estimate of how much time the robot has before the ball has passed it
			-- robots near the ball won't have moved for the full extrapolation time by then
			local ballTimeToRobot = r.pos:distanceTo(World.Ball.pos) / averageKickedBallSpeed
			local futureRobot = { ["pos"] = r.pos + r.speed * math.min(ballTimeToRobot, extrapolationTime),
				["radius"] = r.radius, ["speed"] = r.speed, ["isFriendly"] = r.isFriendly }

			table.insert(self._robotList, futureRobot)
			if r ~= World.OpponentKeeper then
				table.insert(self._robotListWithoutKeeper, futureRobot)
			end
		end
	end
end

function ShootGoal:_rateSector(sector, oldSectorMid)
	local sectorWidth = sector[2] - sector[1]

	local hysteresisFactor = 1
	if oldSectorMid and oldSectorMid > sector[1] and oldSectorMid < sector[2] then
		hysteresisFactor = 3
	end

	return sectorWidth * hysteresisFactor
end

function ShootGoal:_findTarget(viewPos, ignoreGoalie, oldTarget)
	local goalStart = (G.OpponentGoalRight - viewPos):angle()
	local goalEnd = (G.OpponentGoalLeft - viewPos):angle()

	-- get all free sectors
	self:_updateRobotLists()
	local robotList = ignoreGoalie and self._robotListWithoutKeeper or self._robotList
	local freeSectors = Goal.getFreeSectors(viewPos, robotList, goalStart, goalEnd)

	-- compute angle of old target (used for hysteresis)
	local oldSectorMid = nil
	if oldTarget then
		oldSectorMid = (oldTarget - viewPos):angle()
	end

	-- find best sector
	local bestRating = 0
	local bestSectorMid = nil
	local bestSectorWidth = 0
	for _,sector in ipairs(freeSectors) do
		local rating = self:_rateSector(sector, oldSectorMid)
		if rating > bestRating then
			bestRating = rating
			bestSectorMid = (sector[1] + sector[2]) * 0.5
			bestSectorWidth = sector[2] - sector[1]
		end
	end

	-- calculate target point
	-- default to shooting at the goal center
	local targetPoint = G.OpponentGoal
	if bestSectorMid then
		local intersection = geom.intersectLineLine(viewPos,
			Vector.fromAngle(bestSectorMid), G.OpponentGoal, Vector(1, 0))
		if intersection then
			targetPoint = intersection
		end
	end

	return targetPoint, bestSectorWidth
end

function ShootGoal:_updateTarget()
	if self._updateTargetTimestamp == World.Time then
		return
	end
	self._updateTargetTimestamp = World.Time

	-- compute viewPos relative to the current robot pos
	local viewPos = self._robot.pos + Vector.fromAngle(self._robot.dir) *
		(self._robot.shootRadius + World.Ball.radius)

	-- search a good target
	local targetPoint, targetWidth = self:_findTarget(viewPos, false, self._shootTargetPoint)

	-- update decision if we ignore the goalie and check for ricochets
	local dirtyCheckAngle = 1.2 * math.pi/180
	local dirtyCheckAngleHysteresis = 0.3 * math.pi/180
	self._dirty = targetWidth < dirtyCheckAngle - dirtyCheckAngleHysteresis or
		(self._dirty and targetWidth < dirtyCheckAngle + dirtyCheckAngleHysteresis)

	-- search a second time if necessary
	if self._dirty then
		targetPoint, targetWidth = self:_findTarget(viewPos, true, self._shootTargetPoint)
	end

	self._shootTargetPoint = targetPoint
	self._shootTargetWidth = targetWidth
end

function ShootGoal:getDecisionMakingBasis()
	self:_updateTarget()
	return self._shootTargetPoint, self._shootTargetWidth, not self._dirty
end

function ShootGoal:_drawDebugInfo()
	local target = nil
	local color = nil
	local mode = nil
	if self._desperate then
		mode = "desperate"
		target = self._desperateChipTargetPoint
		color = vis.colors.redHalf
	else
		target = self._shootTargetPoint
		if self._dirty then
			mode = "dirty"
			color = vis.colors.orangeHalf
		else
			mode = "clean"
			color = vis.colors.yellowHalf
		end
	end

	debug.set("mode", mode)
	vis.addCircle("t/shootgoal: target", target, 0.05, color, true)
end

function ShootGoal:_init()
	self._robotList = {}
	self._robotListWithoutKeeper = {}

	self._robotListTimestamp = 0
	self._updateTargetTimestamp = 0

	self._shootTargetPoint = nil
	self._shootTargetWidth = 0
	self._dirty = false
	self._desperate = false
	self._desperateChipTargetPoint = G.OpponentGoal + Vector(0, -0.21)
end

function ShootGoal:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)


	self:_updateTarget()

	self._desperate = self._shootTargetWidth < 0.5 * math.pi / 180
	if not self._desperate then
		-- perform a linear shot
		self:_shoot(self._shootTargetPoint, math.huge, true,
			math.min(10 * math.pi / 180, self._shootTargetWidth or math.huge))
	else
		-- perform a chip shot
		self:_shoot(self._desperateChipTargetPoint,
			self._desperateChipTargetPoint:distanceTo(World.Ball.pos), false, 10 * math.pi / 180)
	end
	self:_drawDebugInfo()
end

return ShootGoal
