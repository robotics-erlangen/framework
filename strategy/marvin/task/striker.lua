local SuggestPass = require "task/ability/suggestpass"
local CornerAttack = require "task/ability/cornerattack"
local Striker = Class("Task.Striker", require "task/base", SuggestPass, CornerAttack)

local Constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Messaging = require "control/messaging"
local ObserverGame = require "observer/game"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Interval = require "util/interval"


local POSITION_PADDING = 0.02 -- safety distance

function Striker:_init()
	self._moveDest = Vector(0,0)
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
			xLines = { 0.6 * World.Geometry.FieldWidthHalf }
		else
			xLines = { -0.6 * World.Geometry.FieldWidthHalf }
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
	if not xPos then
		log("Too many strikers, unmeaningful position")
		xPos = 0
	end
	return xPos
end

function Striker:_calcMoveDest()
	local lineStart = 1/6 * World.Geometry.FieldHeightHalf
	local lineEnd = 0.6 * World.Geometry.FieldHeightHalf
	local possibleIntervals = { { lineStart, lineEnd } }

	local ballPos = World.Ball.pos
	local xPos = self:_xLine()
	local startPoint = Vector(xPos, lineStart)
	local endPoint = Vector(xPos, lineEnd)

	local intervalsToRemove = {}

	-- Don't move between ball and opponent goal
	if math.abs(ballPos.x) > math.abs(xPos) then
		local ballToGoalIntersection = geom.intersectLinesByPoints(
			startPoint, endPoint, ballPos, World.Geometry.OpponentGoal)
		if ballToGoalIntersection and ballToGoalIntersection.y > lineStart
			and ballToGoalIntersection.y < lineEnd
		then
			table.insert(intervalsToRemove, {
				ballToGoalIntersection.y - self._robot.radius - POSITION_PADDING,
				ballToGoalIntersection.y + self._robot.radius + POSITION_PADDING
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

	-- do not move on line from mainAttacker to ball
	local mainAttacker = self._inbox.mainAttacker().trainer
	if mainAttacker then
		local maDir = World.Ball.pos - mainAttacker.pos
		local robotDir = self._moveDest - self._robot.pos
		local _, lambda, lambda2 = geom.intersectLineLine(mainAttacker.pos, maDir, self._robot.pos, robotDir)
		if lambda and lambda >=0 and lambda <= 1 and  -- intersection towards ball
				-- don't stay in own half and don't stay at the ball
				self._robot.pos.y > 0 and self._robot.pos:distanceTo(World.Ball.pos) < 0.25 then
			-- just stay where you are
			self._moveDest = self._robot.pos:copy()
			return
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
		vis.addPath("t/striker: attackerLines", { Vector(xPos, interval[1]), Vector(xPos, interval[2]) }, vis.colors.blue)
	end

	-- move destination: furthest point to closest opp on line
	-- TODO: maybe consider mainAttacker?
	local closestOpp = World.OpponentRobots[1] or { pos = Vector(0,0) }
	for _, opp in ipairs(World.OpponentRobots) do
		if self._robot.pos:distanceTo(opp.pos) < self._robot.pos:distanceTo(closestOpp.pos) then
			closestOpp = opp
		end
	end
	local target = Interval.getFurthestPoint(possibleIntervals, closestOpp.pos.y, self._robot.radius)
	if target then
		vis.addCircle("t/striker/target", Vector(xPos, target), 0.1, vis.colors.blue)
		local switchDir=self._moveDest and (target - self._robot.pos.y) * (self._moveDest.y - self._robot.pos.y) < 0 --do we want to change direction?
		if World.Time - self._lastDirChange > 1.5 then -- against flickering
			self._moveDest = Vector(xPos, target)
			if switchDir then
				self._lastDirChange=World.Time
			end
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
	local passToMe = next(self._inbox.passPos())
	if shootDest and not passToMe then
		local minBallDist = self._robot.radius + World.Ball.radius + POSITION_PADDING
		local intersection, dist = self._robot.pos:orthogonalProjection(shooter.pos, shootDest)
		local intersectionWithPass, lambda, lambda2 =
			geom.intersectLineLine(shooter.pos, (shootDest-shooter.pos),
			self._robot.pos, (self._moveDest - self._robot.pos))
		debug.set("move dest", self._moveDest)
		debug.set("lambda 1", lambda)
		debug.set("lambda 2", lambda2)
		if intersectionWithPass then
			vis.addCircle("t/striker/shotIntersection", intersectionWithPass, 0.05, vis.colors.red)
		end
		if intersectionWithPass and math.bound(0, lambda, 1) == lambda
				and math.bound(0, lambda2, 1) == lambda2 then
			--log("did not interfere with passing")
			--debug.set("switching pos")
			if intersection.y < self._robot.pos.y then -- move upwards
				self._moveDest.y = intersection.y + 1.5 * minBallDist
				--log("y switched right")
			else -- move downwards
				self._moveDest.y = intersection.y - 1.5 * minBallDist
				--log("y switched left")
			end

			if (intersectionWithPass.x <= self._robot.pos.x and self._moveDest.x <= intersectionWithPass.x) or
				(intersectionWithPass.x > self._robot.pos.x and self._moveDest.x > intersectionWithPass.x) then
				self._moveDest.x = -self._moveDest.x
				--log("x switched")
			end
		end
	end
	self._moveDest = Field.limitToAllowedField(self._moveDest, self._robot.radius)
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

	self:_calcMoveDest()
	self:_suggestPass(self._moveDest)
	if(self._moveDest.x==0 and self._moveDest.y==0) then
		log("attacker at (0|0)")
	end
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
	self._send.moveDest("all", self._moveDest)
end

return Striker
