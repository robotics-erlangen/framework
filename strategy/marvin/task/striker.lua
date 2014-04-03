local Striker = (require "../base/class").new("Task.Striker", require "task/base")

local World = require "../base/world"
local vis = require "../base/vis"
local Constants = require "../base/constants"
local ToTarget = require "trajectory/totarget"
local ObserverGame = require "observer/game"
local geom = require "../base/geom"
local Interval = require "util/interval"

Striker.priority = 1

function Striker:_init()
	self._moveDest = nil
	self._noTargetFound = nil
end

--- chooses an x line. each striker gets the same line in all task instances
function Striker:_xLine()
	local ballPos = World.Ball.pos
	local numAttackers = table.count(self._inbox.attackerFlag("all"))
	local xLines	
	if numAttackers == 2 then
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
	else
		log("Warning: No reasonable striker position with " .. numAttackers .. " attackers")
		return
	end

	local strikers = {}
	for robot, _ in pairs(self._inbox.attackerFlag("all")) do
		if robot ~= self._inbox.mainAttacker().trainer then
			table.insert(strikers, robot)
		end
	end
	table.sort(strikers, function(r1, r2) return r1.pos.x < r2.pos.x end)

	if numAttackers > #strikers then
		-- remove line closest to ball, because mainAttacker will be there
		for i, x in ipairs(xLines) do
			if ballPos.x < x or i == #xLines then
				table.remove(xLines, i)
				break
			elseif ballPos.x < xLines[i+1] then
				if math.abs(ballPos.x - x) < math.abs(ballPos.x - xLines[i+1]) then
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
	if not xPos then
		self._moveDest = self._robot.pos
		return -- _xLine() logged a warning
	end
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

	local minBallDist = 0.7
	if math.abs(ballPos.x - xPos) < minBallDist then
		local cut1, cut2 = geom.intersectLineCircle(
			startPoint, endPoint-startPoint, ballPos, minBallDist)
		if cut1 and cut2 then
			local min = math.min(cut1.y, cut2.y)
			local max = math.max(cut1.y, cut2.y)
			table.insert(intervalsToRemove, { math.bound(lineStart, min, lineEnd), math.bound(lineStart, max, lineEnd) })
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

	-- TODO: do not interfere with passes.

	Interval.merge(intervalsToRemove)
	local possibleIntervals = Interval.negate(intervalsToRemove, lineStart, lineEnd)
	for i, interval in ipairs(possibleIntervals) do
		vis.addPath("attackerLine"..self._robot.id..i, { Vector.create(xPos, interval[1]), Vector.create(xPos, interval[2]) }, vis.colors.blue)
	end
	
	local closestOpp = World.OpponentRobots[1] or { pos = Vector.create(0,0) }
	for _, opp in ipairs(World.OpponentRobots) do
		if self._robot.pos:distanceTo(opp.pos) < self._robot.pos:distanceTo(closestOpp.pos) then
			closestOpp = opp
		end
	end
	local target = Interval.getFurthestPoint(possibleIntervals, closestOpp.pos.y, self._robot.radius)
	if target then
		self._moveDest = Vector.create(xPos, target)
	else
		self._moveDest = self._robot.pos
		self._noTargetFound = World.Time
		if World.Time - self._noTargetFound > 1 then
			log("Striker (Robot " .. self._robot.id .. ") finds no move destination" )
		end
	end
end

--- returns a postion and the time advance over opponents
function Striker:_suggestPass()
	-- TODO, have a look at CMDragon 2014 TDP
end

function Striker:run()
	if not self._inbox.attackerFlag("all")[self._robot] then
		return -- we're not considered at position choice
	end

	self:_calcMoveDest()

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
	self._send("all").moveDest(self._moveDest)
end

return Striker
