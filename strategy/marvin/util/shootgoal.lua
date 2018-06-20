local ShootGoal = {}

local Cache = require "../base/cache"
local geom = require "../base/geom"
local World = require "../base/world"
local G = World.Geometry

local Ball = require "observer/ball"
local Goal = require "observer/goal"

--- returns the lists of interfering robots (with and without the keeper)
-- @name getRobotLists
-- @param ownRobot Robot - the robot that will shoot the ball
-- @return { Robot } - the list of all interfering robots
-- @return { Robot } - the above list without the opponent keeper
function ShootGoal.getRobotLists(ownRobot)
	-- constant extrapolation time
	-- after this reaction time the robots tend to block the shot
	-- thus further extrapolation does not really make sense
	local extrapolationTime = 0.2
	local averageKickedBallSpeed = 6

	local robotList = {}
	local robotListWithoutKeeper = {}

	-- consider all robots (also our ones)
	for _,r in ipairs(World.Robots) do
		if r ~= ownRobot then
			-- crude estimate of how much time the robot has before the ball has passed it
			-- robots near the ball won't have moved for the full extrapolation time by then
			local ballTimeToRobot = r.pos:distanceTo(World.Ball.pos) / averageKickedBallSpeed
			local futureRobot = { ["pos"] = r.pos + r.speed * math.min(ballTimeToRobot, extrapolationTime),
				["radius"] = r.radius, ["speed"] = r.speed, ["isFriendly"] = r.isFriendly }

			table.insert(robotList, futureRobot)
			if r ~= World.OpponentKeeper then
				table.insert(robotListWithoutKeeper, futureRobot)
			end
		end
	end
	return robotList, robotListWithoutKeeper
end
ShootGoal.getRobotLists = Cache.forFrame(ShootGoal.getRobotLists)

--- returns a rating for a given sector, prioritizing already chosen ones
-- @name rateSector
-- @param sector { number } - the sector to rate
-- @param oldSectorMid number - the position that was chosen in the last frame
-- @return number - rating
function ShootGoal.rateSector(sector, oldSectorMid)
	local sectorWidth = sector[2] - sector[1]

	local hysteresisFactor = 1
	if oldSectorMid and oldSectorMid > sector[1] and oldSectorMid < sector[2] then
		hysteresisFactor = 3
	end

	return sectorWidth * hysteresisFactor
end

--- looks for an optimal target in the opponent goal
-- @name findTarget
-- @param ownRobot Robot - the robot that will shoot the ball
-- @param viewPos Vector - the position the ball is shot from
-- @param ignoreGoalie bool - whether the keeper should be ignored
-- @param oldTarget Vector - the target position that was chosen in the last frame
-- @return Vector - the midpoint of the chosen sector
-- @return angle - the witdh of the chosen sector
function ShootGoal.findTarget(ownRobot, viewPos, ignoreGoalie, oldTarget)
	local goalStart = (G.OpponentGoalRight - viewPos):angle()
	local goalEnd = (G.OpponentGoalLeft - viewPos):angle()

	local ballDiameterAngle = (2 * World.Ball.radius) / G.OpponentGoalRight:distanceTo(viewPos)
	if viewPos.x > G.OpponentGoalRight.x then
		goalStart = goalStart + ballDiameterAngle
	elseif viewPos.x < G.OpponentGoalLeft.x then
		goalEnd = goalEnd - ballDiameterAngle
	end

	if goalEnd < goalStart then
		return G.OpponentGoal, 0
	end

	-- get all free sectors
	local robotListWithKeeper, robotListWithoutKeeper = ShootGoal.getRobotLists(ownRobot)
	local robotList = ignoreGoalie and robotListWithoutKeeper or robotListWithKeeper
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
		local rating = ShootGoal.rateSector(sector, oldSectorMid)
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

--- decides on where to shoot
-- @name ownRobot Robot - the robot that will shoot the ball
-- @param oldTarget Vector - the target position that was chosen in the last frame
-- @param oldDirty bool - whether the dirty flag was set in the last frame
-- @param attackPosition Vector - optional, if set, use this position instead of robot dribbler
-- @return Vector - the midpoint of the chosen sector
-- @return angle - the witdh of the chosen sector
-- @return bool - the dirty flag
local TIME_UNTIL_MIN_ANGLE = 5
function ShootGoal.updateTarget(ownRobot, oldTarget, oldDirty, attackPosition)
	-- compute viewPos relative to the current robot pos
	local viewPos = attackPosition or (ownRobot.pos + Vector.fromAngle(ownRobot.dir) *
										(ownRobot.shootRadius + World.Ball.radius))

	-- search a good target
	local targetPoint, targetWidth = ShootGoal.findTarget(ownRobot, viewPos, false, oldTarget)

	-- update decision if we ignore the goalie and check for ricochets
	local ballOwnershipDuration = Ball.friendlyBallOwnershipDuration()
	local maxExtraAngle = 1.5/180 * math.pi
	local dirtyCheckAngle = 2.5/180 * math.pi + maxExtraAngle * math.max(0, 1 - ballOwnershipDuration / TIME_UNTIL_MIN_ANGLE)
	--log("dirtyCheckAngle: "..tostring(dirtyCheckAngle/math.pi * 180))
	local dirtyCheckAngleHysteresis = 0.3 * math.pi/180
	local dirty = targetWidth < dirtyCheckAngle - dirtyCheckAngleHysteresis or
		(oldDirty and targetWidth < dirtyCheckAngle + dirtyCheckAngleHysteresis)

	-- search a second time if necessary
	if dirty then
		targetPoint, targetWidth = ShootGoal.findTarget(ownRobot, viewPos, true, oldTarget)
	end

	if viewPos.y < -0.3 or oldDirty and viewPos.y < -0.1 then
		dirty = true
	end

	return targetPoint, targetWidth, dirty
end
ShootGoal.updateTarget = Cache.forFrame(ShootGoal.updateTarget)

return ShootGoal
