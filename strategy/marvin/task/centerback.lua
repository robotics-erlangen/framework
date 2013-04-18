local CenterBack = (require "../base/class").new("Task.CenterBack", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Goal = require "observer/goal"
local G = World.Geometry

CenterBack.priority = 5

function CenterBack:_init()
end

--- Returns the closest intersection point of a line with the defense area to onpoint
-- @param onpoint Vector - a point on the line
-- @param angle number - the absolute angle of the line (e.g. '(p2-p1):angle()')
-- @param extraRadius number - some extra distance added to the defense area
-- @param opp bool - if calculated for the opponent defense area
-- @return Vector - the intersection point
local function intersectLineWithDefenseArea(onpoint, angle, extraRadius, opp)
	extraRadius = extraRadius or 0
	local team = opp and -1 or 1
	local dir = Vector.fromAngle(angle)
	
	local intersections = {}

	--line intersection
	local defenseLineOnpoint = Vector.create(0, (-G.FieldHeightHalf + G.DefenseRadius + extraRadius)*team)
	local lineIntersection,_,l2 = geom.intersectLineLine(onpoint, dir, defenseLineOnpoint, Vector.create(1,0))
	if lineIntersection and math.abs(l2) <= G.DefenseStretch/2 then
		table.insert(intersections, lineIntersection)
	end

	--left circle intersection
	local gleft = Vector.create(-G.DefenseStretch/2, (opp and 1 or -1) * G.FieldHeightHalf)
	local lintersect1, lintersect2 = geom.intersectLineCircle(onpoint, dir, gleft, G.DefenseRadius + extraRadius)
	if lintersect1 and lintersect1.x < -G.DefenseStretch/2
			and lintersect1.y > -G.FieldHeightHalf and lintersect1.y < G.FieldHeightHalf then
		table.insert(intersections, lintersect1)
	elseif lintersect2 and lintersect2.x < -G.DefenseStretch/2
			and lintersect2.y > -G.FieldHeightHalf and lintersect2.y < G.FieldHeightHalf then
		table.insert(intersections, lintersect2)
	end

	--right circle intersection
	local gright = Vector.create(G.DefenseStretch/2, (opp and 1 or -1) * G.FieldHeightHalf)
	local rintersect1, rintersect2 = geom.intersectLineCircle(onpoint, dir, gright, G.DefenseRadius + extraRadius)
	if rintersect1 and rintersect1.x > G.DefenseStretch/2
			and rintersect1.y > -G.FieldHeightHalf and rintersect1.y < G.FieldHeightHalf then
		table.insert(intersections, rintersect1)
	elseif rintersect2 and rintersect2.x > G.DefenseStretch/2
			and rintersect2.y > -G.FieldHeightHalf and rintersect2.y < G.FieldHeightHalf then
		table.insert(intersections, rintersect2)
	end	


	--min search
	local minDistance = math.huge
	local minIntersection = nil
	for i = 1, #intersections do
		local dist = onpoint:distanceTo(intersections[i])
		if dist < minDistance then
			minDistance = dist
			minIntersection = intersections[i]
		end
	end

	return minIntersection
end

function CenterBack:_run()
	--extra distance to defense area
	--robot should stay away 1cm from the defense area obstacle specified in base/path
	local extraDistance = Settings.positionPadding + 0.01

	--get all unoccupied sectors
	local robots = {}
	for _,r in ipairs(World.Robots) do
		if r ~= self._robot and r.pos.y < World.Ball.pos.y then
			table.insert(robots, r)
		end
	end
	local freeSectors = Goal.freeSectors(World.Ball.pos, robots, false)

	--determine, in which sector the robot stands, if any
	local selfAngle = (self._robot.pos - World.Ball.pos):angle()
	local isInSector = false
	local selfSectorIndex
	local selfSectorSize
	local selfSectorMid
	for i = 1, #freeSectors do
		if freeSectors[i][2] >= selfAngle and freeSectors[i][1] <= selfAngle then
			selfSectorIndex = i
			selfSectorSize = freeSectors[i][2] - freeSectors[i][1]
			selfSectorMid = (freeSectors[i][2] + freeSectors[i][1])*0.5
			isInSector = true
			break
		end
	end

	--get largest sector, except the one blocked by this robot
	local maxSectorIndex
	local maxSectorSize = 0
	local maxSectorMid
	for i = 1, #freeSectors do
		if i ~= selfSectorIndex then
			local size = freeSectors[i][2] - freeSectors[i][1]
			if size > maxSectorSize then
				maxSectorIndex = i
				maxSectorSize = size
				maxSectorMid = (freeSectors[i][2] + freeSectors[i][1])/2
			end
		end
	end

	--calculate destination position
	local destinationPos

	local selfSectorPos = nil
	if selfSectorMid then 
		selfSectorPos = intersectLineWithDefenseArea(World.Ball.pos, selfSectorMid, self._robot.radius + extraDistance, false)
	end
	local maxSectorPos = nil
	if maxSectorMid then 
		maxSectorPos = intersectLineWithDefenseArea(World.Ball.pos, maxSectorMid, self._robot.radius + extraDistance, false)
	end

	local defaultPos = Vector.create(0, -G.FieldHeightHalf + G.DefenseRadius + self._robot.radius + extraDistance)
	if World.Ball.pos.y <= -G.FieldHeightHalf then
		destinationPos = defaultPos
	elseif not selfSectorPos then
		--no free sector
		if not maxSectorPos then
			local dir = (Vector.create(0, -G.FieldWidthHalf) - World.Ball.pos):angle()
			destinationPos = intersectLineWithDefenseArea(World.Ball.pos, dir, self._robot.radius + extraDistance, false)
		--only one free sector: maxSector
		else
			destinationPos = maxSectorPos
		end
	else
		 --only one free sector: selfSector
		if not maxSectorPos then
			destinationPos = selfSectorPos
		--more free sectors
		else
			local maxSectorMoreWay = self._robot.pos:distanceTo(maxSectorPos) - self._robot.pos:distanceTo(selfSectorPos)
			if maxSectorMoreWay < 0 then
				maxSectorMoreWay = 0
			end

			-- TODO test hysteresis constants
			local baseHysteresis = 5 --if even ways, 5 deg hysteresis
			local hysteresisPerMeter = 45 --45 deg per meter more hysteresis
			local hysteresis = (baseHysteresis + maxSectorMoreWay*hysteresisPerMeter)/180*math.pi

			if selfSectorSize < maxSectorSize - hysteresis then
				destinationPos = maxSectorPos
			else
				destinationPos = selfSectorPos
			end
		end
	end

	if not destinationPos then
		destinationPos = defaultPos
	end

	--calculate destinationDir
	local dir = (destinationPos - Vector.create(0, -G.FieldHeightHalf)):angle()

	--move robot
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, destinationPos, dir)
end

function CenterBack.factory(position)
	local f = function (robots)
		return CenterBack.create(robots[position])
	end
	return f
end

function CenterBack.test(id)
	if id > 0 then
		return nil
	end
	return CenterBack.factory(1), 1
end

return CenterBack
