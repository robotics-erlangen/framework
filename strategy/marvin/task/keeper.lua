local ForceShoot = require "task/ability/forceshoot"
local Keeper = Class("Task.Keeper", require "task/base", ForceShoot)

local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local G = World.Geometry
local keeperGoalDistance = 0.06
local goalNormal = Vector(0, 1)

function Keeper:_init()
	self._defendCorner = false
end

--moves keeper do defending possition
function Keeper:run()
	local atkPos, atkDir, isShot = Goal.predictShot()
	atkDir = atkDir:copy():setLength(30)
	local side = math.sign(atkPos.x)

	-- check if opponent would shoot at the goal from somewhere near the field corners
	-- how far the ball is off to the sides
	-- use hysteresis to prevent flickering between positions
	local sideAngle = goalNormal:absoluteAngleDiff(atkPos - G.FriendlyGoal)
	if sideAngle > 45/180*math.pi then
		self._defendCorner = true
	elseif sideAngle < 30/180*math.pi then
		self._defendCorner = false
	end

	-- keep the goalie inside the goal to exploit its full diameter for blocking incoming balls
	local goalWidthHalf = G.GoalWidth/2 - 0.03

	-- line to move along for defending
	local defenseLineStart, defenseLineEnd, fallbackPos
	-- corners should be defended and atkPos is outside the goal
	if self._defendCorner and (math.abs(atkPos.x) > goalWidthHalf
			or atkPos.y < G.FriendlyGoal.y - G.GoalDepth) then
		debug.set("mode", "defend corner")
		-- defend short corner
		-- line starts a goal post, stay as near to the goal as possible
		defenseLineStart = Vector(side*goalWidthHalf, G.FriendlyGoal.y)
		local lineDir = ((Vector(0, defenseLineStart.y) - atkPos):perpendicular() * side):normalize()
		-- move startpoint out of the goal along the direction
		defenseLineStart = defenseLineStart + lineDir * self._robot.radius

		-- opposite corner
		local otherGoalPost = Vector(-side*goalWidthHalf, G.FriendlyGoal.y)
		-- position where the robot would block the otherGoalPost
		-- lambdaLine is distance from defenseLineStart in direction of lineDir
		local _, lambdaLine = geom.intersectLineLine(defenseLineStart, lineDir,
				otherGoalPost, atkPos - otherGoalPost)

		-- allow moving behind ball we it's shot
		if not isShot then
			lambdaLine = lambdaLine - self._robot.radius
		end
		defenseLineEnd = defenseLineStart + lineDir * math.max(0, lambdaLine)

		-- stick to goal post as fallback
		fallbackPos = defenseLineStart
	else
		debug.set("mode", "defend line")
		-- defend along the goal line and occupy as much space in the goal as possible
		-- idea: cut defense line with line from goal posts to ball (attack pos)
		-- account for robot radius
		local goalCornerLeft = Vector(-goalWidthHalf, G.FriendlyGoal.y)
		local goalCornerRight = Vector(goalWidthHalf, G.FriendlyGoal.y)
		local goalLineY = G.FriendlyGoal.y + keeperGoalDistance + self._robot.radius
		local lineDist = math.abs(goalLineY - goalCornerLeft.y)

		local leftBound = -goalWidthHalf
		local angleLeft = goalNormal:angleDiff(atkPos - goalCornerLeft)
		if math.abs(angleLeft) < math.pi / 2 then
			-- distance cutoff by angle to atkPos + distance blocked by robot radius
			-- ignore robot radius when isShot is set, in order to allow the robot to get behind the ball
			local leftDist = -math.tan(angleLeft) * lineDist + (isShot and 0 or self._robot.radius / math.cos(angleLeft))
			leftBound = leftBound + math.max(0, leftDist)
		end

		local rightBound = goalWidthHalf
		local angleRight = goalNormal:angleDiff(atkPos - goalCornerRight)
		if math.abs(angleRight) < math.pi / 2 then
			local rightDist = -math.tan(angleRight) * lineDist - (isShot and 0 or self._robot.radius / math.cos(angleRight))
			rightBound = rightBound + math.min(0, rightDist)
		end

		defenseLineStart = Vector(leftBound, goalLineY)
		defenseLineEnd = Vector(rightBound, goalLineY)
		-- center
		fallbackPos = (defenseLineEnd + defenseLineStart) * 0.5
	end

	-- intersect defense line with ball trajectory
	local defenseDir = defenseLineEnd - defenseLineStart
	local _, lambdaDef = geom.intersectLineLine(defenseLineStart, defenseDir,
			atkPos, atkDir)
	local intersectPos
	local successfulIntersection -- is original intersection point on the defense line
	if lambdaDef then
		debug.set("lambdaDef", lambdaDef)
		local lambdaBounded = math.bound(0, lambdaDef, 1)
		successfulIntersection = (lambdaDef == lambdaBounded)
		if lambdaDef == lambdaBounded
				-- add some safety cm to detect shots towards the goal posts even without precise ball direction
				or defenseDir:length() >= 0.01 and math.abs(lambdaDef - lambdaBounded) < 0.05 / defenseDir:length() then
			successfulIntersection = true
		end
		-- limit to positions on the line segment!
		intersectPos = defenseLineStart + defenseDir * lambdaBounded
	else
		successfulIntersection = false
		-- ensure there's an intersect pos
		intersectPos = fallbackPos
	end

	vis.addPath("t/keeper: KeeperShotPrediction",{atkPos,atkPos+atkDir}, vis.colors.blue)
	vis.addCircle("t/keeper: KeeperDefenseLineIntersect", intersectPos, 0.03, vis.colors.blue)
	vis.addPath("t/keeper: KeeperDefenseLine",{defenseLineStart, defenseLineEnd}, vis.colors.blue)

	local moveTo
	local endSpeed
	-- ball is shot at the goal: take the shortest way to stop the ball
	if isShot and atkDir.y < 0 and successfulIntersection and
			Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
		-- nearest pos on the ball trajectory
		moveTo = self._robot.pos:nearestPosOnLine(atkPos, atkPos+atkDir)
		-- prevent moving into the goal
		if moveTo.y < defenseLineStart.y then
			moveTo = intersectPos
		end

		--get to position as fast as possible
		local ballRollDistance = math.max(0, moveTo:distanceTo(World.Ball.pos)-World.Ball.radius-self._robot.shootRadius)
		local availableTime = Physics.ballRollTime(World.Ball, ballRollDistance)

		-- anywhere on the dribbler is okay, not only the center
		local dribblerHalf = atkDir:perpendicular():setLength(self._robot.dribblerWidth / 2)
		local endPos = self._robot.pos:nearestPosOnLine(moveTo + dribblerHalf, moveTo - dribblerHalf)

		endSpeed = Physics.robotMinEndspeed(self._robot, endPos, availableTime)
		debug.set("endSpeed", endSpeed)

	-- block estimated shoot line
	elseif atkDir.y < 0 then
		local k = math.bound(0, (atkPos.y+2)/2 * 0.6, 0.5)
		moveTo = intersectPos * (1-k) + Vector(0, -G.FieldHeightHalf + keeperGoalDistance + self._robot.radius) * k
	else -- don't know where to go, just center in the goal / corner
		moveTo = fallbackPos
	end

	-- ignore goal walls if ball is shot
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true, isShot, true, self._robot.radius, 0.05)
	-- add obstacles if outside keeper area, when drivin to goal initially
	if not Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
		PathHelper.addRobotObstacles(self._robot.path, self._robot, false, false)
	end
	self._robot.trajectory:update(ToTarget, moveTo, (atkPos - moveTo):angle(), nil, endSpeed)

	if not self._robot:hasBall(World.Ball) then
		self._forceShootTimer = nil
	end
	local chipActivationAngle = math.pi / 6
	local ballToRobot = self._robot.pos - World.Ball.pos
	if (World.RefereeState == "Game" or World.RefereeState == "GameForce") and
			World.Ball.speed:absoluteAngleDiff(ballToRobot) < chipActivationAngle
			and World.Ball.pos:distanceTo(self._robot.pos) < 1 then
		debug.set("chip", true)
		self._robot:chip(3)
		self:_doForceShoot()
	end
end

return Keeper
