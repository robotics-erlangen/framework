local Striker = Class("Group.Striker")

local debug = require "../base/debug"
local Field = require "../base/field"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

function Striker:init()
	self.name = "striker"

	self._strikerCount = 0

	self._zones = {}
	self._emptyZone = nil

	self._lastMainAttacker = nil
end

local function getDefaultPosition(boundaries)
	local zoneWidth = boundaries.right - boundaries.left
	local zoneHeight = boundaries.top - boundaries.bottom
	local x, y
	repeat
		x = (math.random() * 0.6 + 0.2) * zoneWidth + boundaries.left
		y = (math.random() * 0.6 + 0.2) * zoneHeight + boundaries.bottom
	until not Field.isInOpponentDefenseArea(Vector(x, y), 0.2)
	return Vector(x, y)
end

local function visualizeZone(zone)
	local edge = 0.05
	local left = zone.boundaries.left + edge
	local right = zone.boundaries.right - edge
	local top = zone.boundaries.top - edge
	local bottom = zone.boundaries.bottom + edge
	local points = { Vector(left, top), Vector(left, bottom), Vector(right, bottom), Vector(right, top), Vector(left, top) }
	vis.addPath("g/striker: Zones", points, vis.colors.gold, nil, nil, 0.02)
end

local function assignRobotsToZones(robotPositions, zones)
	local n = #zones
	if n == 0 then
		return {}
	end

	local robots = {}
	local costMatrix = {}

	local robotIndex = 1
	for robot, robotPos in pairs(robotPositions) do
		table.insert(robots, robot)
		table.insert(costMatrix, {})
		for _, zone in ipairs(zones) do
			table.insert(costMatrix[robotIndex], robotPos:distanceTo(zone.defaultPos))
		end
		robotIndex = robotIndex + 1
	end

	local remainingRobotIndices = {}
	local remainingZoneIndices = {}
	for _ = 1, n do
		table.insert(remainingRobotIndices, true)
		table.insert(remainingZoneIndices, true)
	end

	local zoneAssignment = {}
	for _ = 1, n do
		local minCost = math.huge
		local minCostRobotIdx
		local minCostZoneIdx
		for robotIdx = 1, n do
			if remainingRobotIndices[robotIdx] then
				for zoneIdx = 1, n do
					if remainingZoneIndices[zoneIdx] then
						local cost = costMatrix[robotIdx][zoneIdx]
						if cost < minCost then
							minCost = cost
							minCostRobotIdx = robotIdx
							minCostZoneIdx = zoneIdx
						end
					end
				end
			end
		end
		remainingRobotIndices[minCostRobotIdx] = false
		remainingZoneIndices[minCostZoneIdx] = false
		local robot = robots[minCostRobotIdx]
		local zone = zones[minCostZoneIdx]
		zoneAssignment[zone] = robot
	end

	return zoneAssignment
end

function Striker:_updateZones(robots)
	local totalLeft = -G.FieldWidthHalf
	local totalRight = G.FieldWidthHalf
	local totalTop = G.FieldHeightHalf
	local totalBottom = -G.FieldHeightQuarter

	local nStrikers = #robots
	local remainingZones = nStrikers + 1 -- one zone will stay empty
	self._strikerCount = nStrikers

	-- reset the zones
	self._zones = {}
	if remainingZones == 0 then
		return
	end

	-- create midfield zone
	do
		local boundaries = { left = totalLeft, right = totalRight, top = 0, bottom = totalBottom }
		local defaultPos = getDefaultPosition(boundaries)
		table.insert(self._zones, {boundaries = boundaries, defaultPos = defaultPos})
		remainingZones = remainingZones - 1
	end

	-- create offensive zones
	local zoneWidth = (totalRight - totalLeft) / remainingZones
	for i = 1, remainingZones do
		local boundaries = { left = totalLeft + (i - 1) * zoneWidth, right = totalLeft + i * zoneWidth,
				top = totalTop, bottom = 0 }
		local defaultPos = getDefaultPosition(boundaries)
		table.insert(self._zones, {boundaries = boundaries, defaultPos = defaultPos})
	end

	-- reset empty zone hysteresis
	self._emptyZone = nil
end

function Striker:_chooseEmptyZone(mainAttackerPos)
	local emptyZoneHysteresis = self._emptyZone and 0.2 or 0
	if mainAttackerPos then
		for _, zone in ipairs(self._zones) do
			if mainAttackerPos.x >= zone.boundaries.left + emptyZoneHysteresis
					and mainAttackerPos.x <= zone.boundaries.right - emptyZoneHysteresis 
					and mainAttackerPos.y >= zone.boundaries.bottom + emptyZoneHysteresis
					and mainAttackerPos.y <= zone.boundaries.top - emptyZoneHysteresis then
				self._emptyZone = zone
				break
			end
		end
	end

	-- default: midfield zone is empty
	if not self._emptyZone and #self._zones > 0 then
		self._emptyZone = self._zones[1]
	end
end

function Striker:run(sender, inbox, messages)
	local robots = table.keys(messages)
	local mainAttacker = inbox.mainAttacker().trainer

	-- if the mainAttacker changes, assume that the previous mainAttacker becomes a striker instead
	local robotsTmp = {}
	for _, robot in ipairs(robots) do
		if robot == mainAttacker and self._lastMainAttacker then
			table.insert(robotsTmp, self._lastMainAttacker)
		else
			table.insert(robotsTmp, robot)
		end
	end
	robots = robotsTmp

	-- update zones if necessary
	if #robots ~= self._strikerCount then
		self:_updateZones(robots)
	end

	-- choose which zone is occupied by the mainAttacker
	self:_chooseEmptyZone(mainAttacker and mainAttacker.pos)

	-- assign the zones to the nearest strikers
	local robotPositions = {} -- robot -> pos
	local _, passInfoTable = next(inbox.passInfo())
	for _, r in ipairs(robots) do
		local pos = r.pos + Vector.fromAngle(r.dir) * (r.shootRadius + World.Ball.radius)
		if passInfoTable then
			for _, passInfo in ipairs(passInfoTable) do
				if passInfo.target == r then
					pos = passInfo.ballPos
				end
			end
		end
		robotPositions[r] = pos
	end

	local zoneList = {} -- { zone }
	for _, zone in ipairs(self._zones) do
		if zone ~= self._emptyZone then
			table.insert(zoneList, zone)
			visualizeZone(zone)
		end
	end

	local robotZones = assignRobotsToZones(robotPositions, zoneList)

	for zone, robot in pairs(robotZones) do
		sender.strikerZone(robot, zone)
	end

	debug.set("number of zones", self._zoneCount)
	debug.set("empty zone index", self._unoccupiedZoneIndex)

	self._lastMainAttacker = mainAttacker
end

return Striker
