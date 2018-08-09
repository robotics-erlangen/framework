local ForceShoot = require "task/ability/forceshoot"
local HallucinatingKeeper = Class("Task.HallucinatingKeeper", require "task/base", ForceShoot)

local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local IO = require "util/io"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local G = World.Geometry
local KEEPER_GOAL_DISTANCE = 0.06
local GOAL_NORMAL = Vector(0, 1)

function HallucinatingKeeper:_init(filename)
	self._defendCorner = false
	self._ballData = IO.readLines(filename)
	self._ball = World.Ball
	self._line = 1
	self._hit = nil
	self._predictShot = {
		atkPos = nil,
		atkDir = nil,
		isShot = false
	}
end

function HallucinatingKeeper:_update()
	local ballDataString = self._ballData[self._line]

	if ballDataString:sub(1, 8) == "New Shot" then
		log(ballDataString)
		self._hit = nil
		self._line = (self._line % #self._ballData) + 1
		return self:_update()
	end

	local curBallData = {}
	for data in ballDataString:gmatch("%S+") do
		table.insert(curBallData, data)
	end

	debug.set("curBallData", curBallData)
	local relPosX = tonumber(curBallData[1])
	local relPosY = tonumber(curBallData[2])
	local speedX = tonumber(curBallData[3])
	local speedY = tonumber(curBallData[4])

	self._ball = {
		radius = World.Ball.radius,
		maxSpeed = World.Ball.maxSpeed,
		pos = G.FriendlyGoal + Vector(relPosX, relPosY),
		posZ = 0,
		speed = Vector(speedX, speedY),
		speedZ = 0
	}
	vis.addCircle("test/move/keepertest: Imaginary Ball", self._ball.pos, World.Ball.radius, vis.colors.orange, true)

	local atkPosX = tonumber(curBallData[5])
	local atkPosY = tonumber(curBallData[6])
	local atkDirX = tonumber(curBallData[7])
	local atkDirY = tonumber(curBallData[8])
	local isShot = curBallData[9] == "true"

	self._predictShot = {
		atkPos = Vector(atkPosX, atkPosY),
		atkDir = Vector(atkDirX, atkDirY),
		isShot = isShot
	}

	if not self._hit and self._ball.pos:distanceTo(self._robot.pos) < self._ball.radius+self._robot.radius then
		self._hit = (self._ball.pos-self._robot.pos):angle() - self._robot.dir
	elseif self._hit then
		vis.addCircle("test/move/keepertest: Hit", self._robot.pos + Vector.fromAngle(self._hit+self._robot.dir):setLength(self._robot.radius), 0.015, vis.colors.red, true)
	end

	self._line = (self._line % #self._ballData) + 1
end

--moves keeper do defending possition
function HallucinatingKeeper:run()
	self:_update()

	local atkPos, atkDir, isShot = self._predictShot.atkPos, self._predictShot.atkDir, self._predictShot.isShot
	atkDir = atkDir:copy():setLength(30)
	local side = math.sign(atkPos.x)

	-- check if opponent would shoot at the goal from somewhere near the field corners
	-- how far the ball is off to the sides
	-- use hysteresis to prevent flickering between positions
	local sideAngle = GOAL_NORMAL:absoluteAngleDiff(atkPos - G.FriendlyGoal)
	if sideAngle > 45/180*math.pi then
		self._defendCorner = true
	elseif sideAngle < 30/180*math.pi then
		self._defendCorner = false
	end

	-- keep the goalie inside the goal to exploit its full diameter for blocking incoming balls
	local goalWidthHalf = 1/2

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
		if side*lineDir.x > 0 then
			lineDir = Vector(0, 1)
		end
		-- move startpoint out of the goal along the direction
		defenseLineStart = defenseLineStart + lineDir * (self._robot.radius + 0.005)

		-- opposite corner
		local otherGoalPost = Vector(-side*goalWidthHalf, G.FriendlyGoal.y)
		-- position where the robot would block the otherGoalPost
		-- lambdaLine is distance from defenseLineStart in direction of lineDir
		local _, lambdaLine = geom.intersectLineLine(defenseLineStart, lineDir,
				otherGoalPost, atkPos - otherGoalPost)

		-- allow moving behind ball when it's shot
		lambdaLine = lambdaLine or 0
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
		local goalLineY = G.FriendlyGoal.y + KEEPER_GOAL_DISTANCE + self._robot.radius
		local lineDist = math.abs(goalLineY - goalCornerLeft.y)

		local leftBound = -goalWidthHalf
		local angleLeft = GOAL_NORMAL:angleDiff(atkPos - goalCornerLeft)
		if math.abs(angleLeft) < math.pi / 2 then
			-- distance cutoff by angle to atkPos + distance blocked by robot radius
			-- ignore robot radius when isShot is set, in order to allow the robot to get behind the ball
			local leftDist = -math.tan(angleLeft) * lineDist + (isShot and 0 or self._robot.radius / math.cos(angleLeft))
			leftBound = leftBound + math.max(0, leftDist)
		end

		local rightBound = goalWidthHalf
		local angleRight = GOAL_NORMAL:angleDiff(atkPos - goalCornerRight)
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

	vis.addPath("t/keeper: KeeperShotPrediction",{atkPos,atkPos+atkDir}, vis.colors.green)
	vis.addCircle("t/keeper: KeeperDefenseLineIntersect", intersectPos, 0.03, vis.colors.green)
	vis.addPath("t/keeper: KeeperDefenseLine",{defenseLineStart, defenseLineEnd}, vis.colors.green)

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
		local ballRollDistance = math.max(0, moveTo:distanceTo(self._ball.pos)-self._ball.radius-self._robot.shootRadius)
		local availableTime = Physics.ballRollTime(self._ball, ballRollDistance)
		-- use moveTo position to be there as fast as possible
		endSpeed = Physics.robotMinEndspeed(self._robot, moveTo, availableTime)

		debug.set("endSpeed", endSpeed)

	-- block estimated shoot line
	elseif atkDir.y < 0 then
		local k = math.bound(0, (atkPos.y+2)/2 * 0.6, 0.5)
		moveTo = intersectPos * (1-k) + Vector(0, -G.FieldHeightHalf + KEEPER_GOAL_DISTANCE + self._robot.radius) * k
	else -- don't know where to go, just center in the goal / corner
		moveTo = fallbackPos
	end

	-- ignore goal walls if ball is shot
	local obstacleTable = {
		ignoreBall = true,
		ignoreGoals = isShot,
		ignoreDefenseArea = true,
		stopBallDistance = 0.05,
		ignorePass = true
	}
	-- don't add obstacles if inside keeper area, when drivin to goal initially
	if Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
		obstacleTable.ignoreFriendlyRobots = true
		obstacleTable.ignoreOpponentRobots = true
	end
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, moveTo, (atkPos - moveTo):angle(), nil, endSpeed)

	if not Robot.hadBall(self._robot, 0) then
		self._forceShootTimer = nil
	end
	local chipActivationAngle = math.pi / 6
	local ballToRobot = self._robot.pos - self._ball.pos
	if (World.RefereeState == "Game" or World.RefereeState == "GameForce") and
			self._ball.speed:absoluteAngleDiff(ballToRobot) < chipActivationAngle
			and self._ball.pos:distanceTo(self._robot.pos) < 1 then
		debug.set("chip", true)
		self._robot:chip(3)
		self:_doForceShoot()
	end
end

return HallucinatingKeeper
