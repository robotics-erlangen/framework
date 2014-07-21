local SuggestPass = require "task/ability/suggestpass"
local CornerAttack = require "task/ability/cornerattack"
local Striker = (require "../base/class").newTask("Task.Striker", require "task/base", SuggestPass, CornerAttack)

local World = require "../base/world"
local vis = require "../base/vis"
local Constants = require "../base/constants"
local ToTarget = require "trajectory/totarget"
local ObserverGame = require "observer/game"
local geom = require "../base/geom"
local Interval = require "util/interval"
local debug = require "../base/debug"
local Messaging = require "control/messaging"
local Referee = require "../base/referee"

function Striker:_init()
	self._moveDest = nil
	self._noTargetFound = nil
	self._lastDirChange = 0
end

local function cmpByX(r1, r2)
	return r1.pos.x < r2.pos.x
end

--- chooses an x line. each striker gets the same line in all task instances
function Striker:_xLine()
	local ballPos = World.Ball.pos
	local numAttackers = table.count(Messaging.get("attackerFlag"))
	local xLines
	if numAttackers == 1 then
		if ObserverGame.attackSideWithLessOpponents() == "left" then
			xLines = { 0.5 * World.Geometry.FieldWidthHalf }
		else
			xLines = { -0.5 * World.Geometry.FieldWidthHalf }
		end
	elseif numAttackers == 2 then
		xLines = {
			-0.6 * World.Geometry.FieldWidthHalf,
			0.6 * World.Geometry.FieldWidthHalf
		}
	elseif numAttackers == 3 then
		if ObserverGame.attackSideWithLessOpponents() == "left" then
			xLines = {
				-0.6 * World.Geometry.FieldWidthHalf,
				0.4 * World.Geometry.FieldWidthHalf,
				0.8 * World.Geometry.FieldWidthHalf
			}
		else
			xLines = {
				-0.8 * World.Geometry.FieldWidthHalf,
				-0.4 * World.Geometry.FieldWidthHalf,
				0.6 * World.Geometry.FieldWidthHalf
			}
		end
	elseif numAttackers == 4 then
		xLines = {
			-0.8 * World.Geometry.FieldWidthHalf,
			-0.4 * World.Geometry.FieldWidthHalf,
			0.4 * World.Geometry.FieldWidthHalf,
			0.8 * World.Geometry.FieldWidthHalf
		}
	else -- very unlikely
		xLines = { 0 }
	end

	local strikers = {}
	for robot, _ in pairs(Messaging.get("attackerFlag")) do
		if robot ~= self._inbox.mainAttacker().trainer then
			table.insert(strikers, robot)
		end
	end
	table.sort(strikers, cmpByX)

	if numAttackers > #strikers then
		-- remove line of mainAttacker
		local mainAttacker = self._inbox.mainAttacker().trainer
		local mAPosX = ballPos.x -- fallback
		if mainAttacker then
			mAPosX = mainAttacker.pos.x
			if self._inbox.moveDest()[mainAttacker] then
				mAPosX = self._inbox.moveDest()[mainAttacker].x
			end
		end
		for i, x in ipairs(xLines) do
			if mAPosX < x or i == #xLines then
				table.remove(xLines, i)
				break
			elseif mAPosX < xLines[i+1] then
				if math.abs(mAPosX - x) < math.abs(mAPosX - xLines[i+1]) then
					table.remove(xLines, i)
					break
				else
					table.remove(xLines, i+1)
					break
				end
			end
		end
	end

	-- select x-pos, alternate left and right depending on ball side
	-- the same ordering in strikers and xLines leads to small ways
	local xPos
	assert(#strikers == #xLines, "number of strikers must be the same as number of xLines")
	local leftSideFirst = World.Ball.pos.x < 0 and 1 or 0
	local leftIndex = 0
	local rightIndex = #xLines + 1
	local index
	for i = 1, #xLines do
		if i % 2 == leftSideFirst then
			leftIndex = leftIndex + 1
			index = leftIndex
		else
			rightIndex = rightIndex - 1
			index = rightIndex
		end
		if strikers[index] == self._robot then
			xPos = xLines[index]
			break
		end
	end
	assert(xPos, "Striker error: no xPos assigned")
	return xPos
end

function Striker:_calcMoveDest()
	local lineStart = 1/6 * World.Geometry.FieldHeightHalf
	local lineEnd = 0.6 * World.Geometry.FieldHeightHalf
	local possibleIntervals = { { lineStart, lineEnd } }

	local ballPos = World.Ball.pos
	local xPos = self:_xLine()
	local startPoint = Vector.create(xPos, lineStart)
	local endPoint = Vector.create(xPos, lineEnd)

	local intervalsToRemove = {}

	-- Don't move between ball and opponent goal
	if math.abs(ballPos.x) > math.abs(xPos) then
		local ballToGoalIntersection = geom.intersectLinesByPoints(
			startPoint, endPoint, ballPos, World.Geometry.OpponentGoal)
		if ballToGoalIntersection and ballToGoalIntersection.y > lineStart
			and ballToGoalIntersection.y < lineEnd
		then
			table.insert(intervalsToRemove, {
				ballToGoalIntersection.y - self._robot.radius - Settings.positionPadding,
				ballToGoalIntersection.y + self._robot.radius + Settings.positionPadding
			})
		end
	end
	-- ball-oppGoal line also as obstacle
	self._robot.path:addLine(ballPos.x, ballPos.y, World.Geometry.OpponentGoal.x,
		World.Geometry.OpponentGoal.y, self._robot.radius)

	local minBallDist = 0.7
	if math.abs(ballPos.x - xPos) < minBallDist then
		local cut1, cut2 = geom.intersectLineCircle(
			startPoint, endPoint-startPoint, ballPos, minBallDist)
		if cut1 and cut2 then
			local min = math.bound(lineStart, math.min(cut1.y, cut2.y), lineEnd)
			local max = math.bound(lineStart, math.max(cut1.y, cut2.y), lineEnd)
			debug.set("remove ball cirlce intersection from", min)
			debug.set("remove ball cirlce intersection to", max)
			table.insert(intervalsToRemove, { min, max })
		end
	end
	-- ball also as obstacle
	self._robot.path:addCircle(ballPos.x, ballPos.y, minBallDist)

	-- do not interfere with other attackers
	for robot, dest in pairs(self._inbox.moveDest()) do
			if Messaging.get("attackerFlag")[robot] and robot.pos:distanceTo(dest) > 0.1 then
				self._robot.path:addLine(robot.pos.x, robot.pos.y, dest.x, dest.y, self._robot.radius)
			end
	end

	-- do not move on line between ball and attacker
	for attacker, _ in pairs(self._inbox.attackerFlag()) do
		-- if between ball and attacker on x line
		if (self._robot.pos.x > ballPos.x and self._robot.pos.x < attacker.pos.x) or
				(self._robot.pos.x < ballPos.x and self._robot.pos.x > attacker.pos.x) then
			table.insert(intervalsToRemove, {
				attacker.pos.y - 1.5*self._robot.radius - Settings.positionPadding,
				attacker.pos.y + 1.5*self._robot.radius + Settings.positionPadding
			})
		end
	end

	-- opponents between ball and our line
	for _, robot in ipairs(World.OpponentRobots) do
		if (robot.pos.x > xPos and ballPos.x > xPos and robot.pos.x < ballPos.x)
			or (robot.pos.x < xPos and ballPos.x < xPos and robot.pos.x > ballPos.x)
		then
			local intersection = geom.intersectLinesByPoints(startPoint, endPoint, ballPos, robot.pos)
			if intersection and intersection.y > lineStart and intersection.y < lineEnd then
				table.insert(intervalsToRemove, {
					math.bound(lineStart, intersection.y - 2*self._robot.radius, lineEnd),
					math.bound(lineStart, intersection.y + 2*self._robot.radius, lineEnd)
				})
			end
		end
	end

	Interval.merge(intervalsToRemove)
	local possibleIntervals = Interval.negate(intervalsToRemove, lineStart, lineEnd)
	for _, interval in ipairs(possibleIntervals) do
		vis.addPath("t/striker: attackerLines", { Vector.create(xPos, interval[1]), Vector.create(xPos, interval[2]) }, vis.colors.blue)
	end

	-- move destination: furthest point to closest opp on line
	-- TODO: maybe consider mainAttacker?
	local closestOpp = World.OpponentRobots[1] or { pos = Vector.create(0,0) }
	for _, opp in ipairs(World.OpponentRobots) do
		if self._robot.pos:distanceTo(opp.pos) < self._robot.pos:distanceTo(closestOpp.pos) then
			closestOpp = opp
		end
	end
	local target = Interval.getFurthestPoint(possibleIntervals, closestOpp.pos.y, self._robot.radius)
	if target then
		if self._moveDest and (target - self._robot.pos.y) * (self._moveDest.y - self._robot.pos.y) < 0 then
			self._lastDirChange = World.Time
		end
		if World.Time - self._lastDirChange > 0.5 then -- against flickering
			self._moveDest = Vector.create(xPos, target)
		end
		self._noTargetFound = false
	else
		self._moveDest = self._robot.pos:copy()
		if not self._noTargetFound then
			self._noTargetFound = World.Time
		end
		if World.Time - self._noTargetFound > 1 then
			log("Striker (Robot " .. self._robot.id .. ") finds no move destination" )
		end
	end
	-- do not interfere with shots
	local shooter, shootDest = next(self._inbox.shootDestination())
	local passToMe =  next(self._inbox.passPos())
	if shootDest and not passToMe then
		local minBallDist = self._robot.radius + World.Ball.radius + Settings.positionPadding
		local intersection, dist = self._robot.pos:orthogonalProjection(shooter.pos, shootDest)
		if dist and math.abs(dist) < minBallDist then
			if intersection.y < self._robot.pos.y then -- move upwards
				self._moveDest.y = intersection.y + 1.5 * minBallDist
			else -- move downwards
				self._moveDest.y = intersection.y - 1.5 * minBallDist
			end
		end
	end
end

function Striker:run()
	if Referee.isOffensiveCornerKick() then
		if self:_tryCornerAttack() then
			return -- a cornerAttack is performed
		end
	end

	if not Messaging.get("attackerFlag")[self._robot] then
		return -- we're not considered at position choice
	end
	local startTime = amun.getCurrentTime()
	self:_suggestPass()
	local runTime = math.round((amun.getCurrentTime() - startTime)*1000000)/1000
	--log("pass-pos computation took " .. runTime .. "ms")

	self:_calcMoveDest()

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
	self._send.moveDest("all", self._moveDest)
end

return Striker
