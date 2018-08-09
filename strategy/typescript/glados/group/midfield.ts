local Midfield = Class("Group.Midfield")

local Constants = require "../base/constants"
local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

function Midfield:init()
	self.name = "midfield"

	self._farAwayHyst = false // the ball is far in our own half and we need midfielders to move forward
	self._noMidfielderHyst = false // we are attacking the goal and dont want midfielders at all

	self._zones = {}
	self._topHalfHyst = false

	self._lastMainAttacker = nil
	self._lastRobots = nil
	self._lastAssignments = nil
end

local function getDefaultPosition(boundaries)
	local zoneWidth = math.abs(boundaries.right - boundaries.left)
	local zoneHeight = math.abs(boundaries.top - boundaries.bottom)

	local isInTopHalf = math.abs(boundaries.right) > math.abs(boundaries.left)
	local fraction = isInTopHalf and 1/8 or 7/8

	return Vector(boundaries.right - zoneWidth * fraction, boundaries.bottom + zoneHeight * 2/3)
end

local function visualizeZone(zone)
	local visFlag = true

	if visFlag then
		local edge = 0.05
		local left = zone.boundaries.left + edge
		local right = zone.boundaries.right - edge
		local top = zone.boundaries.top - edge
		local bottom = zone.boundaries.bottom + edge
		local points = { Vector(left, top), Vector(left, bottom), Vector(right, bottom), Vector(right, top) }
		vis.addPolygon("g/Midfield: Zones", points, vis.colors.orchid, nil, nil, 0.02)
	end
end

local function assignRobotsToZones(robotPositions, zones)
	local n = #zones
	if n == 0 then
		return {}
	end

	local zoneAssignment = {}
	for _, zone in ipairs(zones) do
		local minDist = math.huge
		local closestRobot = nil
		for robot, pos in pairs(robotPositions) do
			if not pos then
				break
			end
			local dist = pos:distanceToSq(zone.defaultPos)
			if dist < minDist then
				minDist = dist
				closestRobot = robot
			end
		end
		if closestRobot then
			zoneAssignment[zone] = closestRobot
			robotPositions[closestRobot] = nil
		end
	end

	return zoneAssignment
end

local function determineMidfielderCount(self, nAttackers)
	local nMidfielders
	local thresholdY = self._farAwayHyst and -1 or -2.5
	if World.Ball.pos.y < thresholdY then
		self._farAwayHyst = true
		nMidfielders = 2
	else
		self._farAwayHyst = false
		nMidfielders = 1
	end

	thresholdY = self._noMidfielderHyst and 0 or 1
	if World.Ball.pos.y > thresholdY then
		self._noMidfielderHyst = true
		nMidfielders = 0
	else
		self._noMidfielderHyst = false
		nMidfielders = nMidfielders or 1
	end

	if nAttackers <= nMidfielders then
		nMidfielders = nAttackers - 1
	end

	return nMidfielders
end

function Midfield:_updateZones(nMidfielders)
	self._zones = {}

	local topHalfThreshold = self._topHalfHyst and 1 or 0
	local isInTopHalf = World.Ball.pos.x < topHalfThreshold

	local updateAssignments = self._topHalfHyst ~= isInTopHalf

	self._topHalfHyst = isInTopHalf

	local totalLeft = -G.FieldWidthHalf

	local remainingZones = nMidfielders

	local robotRadius = Constants.maxRobotRadius
	local zoneWidth = G.FieldWidth / 3
	local top = isInTopHalf and -1 or 1
	local verticalOffset = G.FieldWidthHalf / 4
	local horizontalOffset = G.FieldHeightHalf / 4

	// two hardcoded zones, depending on the number of robots we have
	if remainingZones >= 1 then
		local zone = {}
		zone.boundaries = {
			bottom = -G.FieldHeightHalf * 3/5,
			top = G.FieldWidthHalf / 3,
			left = top * (totalLeft + robotRadius + verticalOffset) + top,
			right = top * (totalLeft + robotRadius + verticalOffset + zoneWidth) + top
		}
		zone.defaultPos = getDefaultPosition(zone.boundaries)
		remainingZones = remainingZones - 1
		table.insert(self._zones, zone)
	end

	if remainingZones >= 1 then
		local zone = {}
		zone.boundaries = {
			bottom = -G.FieldHeightHalf * 3/5 + horizontalOffset,
			top = G.FieldWidthHalf / 3 + horizontalOffset,
			right = -top * (totalLeft + robotRadius + verticalOffset + zoneWidth) + top,
			left = -top * (totalLeft + robotRadius + verticalOffset) + top
		}
		zone.defaultPos = getDefaultPosition(zone.boundaries)
		table.insert(self._zones, zone)
	end

	return updateAssignments
end



function Midfield:run(sender, inbox, messages)
	local robots = table.keys(messages)
	local mainAttacker = inbox.mainAttacker().trainer

	// update assignments if necessary
	local updateAssignments = not self._lastRobots or not self._lastAssignments or #robots ~= #self._lastRobots
	if not updateAssignments then
		for i, r in ipairs(robots) do
			if r ~= self._lastRobots[i] then
				updateAssignments = true
				break
			end
		end
	end

	local numAttackers = #table.keys(inbox.attackerFlag())
	local remainingMidfielders = determineMidfielderCount(self, numAttackers)
	if self._lastAssignments and #self._lastAssignments ~= remainingMidfielders then
		updateAssignments = self:_updateZones(remainingMidfielders) or updateAssignments
	end
	updateAssignments = updateAssignments or self._lastRobots and #self._lastRobots ~= remainingMidfielders

	


	// assign the zones to the nearest Midfields
	local robotPositions = {} // robot -> pos
	local _, passInfoTable = next(inbox.passInfo())
	for _, r in ipairs(robots) do
		local pos = r.pos
		if passInfoTable then
			for _, passInfo in ipairs(passInfoTable) do
				if passInfo.target == r then
					pos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos):setLength(r.shootRadius + World.Ball.radius)
				end
			end
		end
		robotPositions[r] = pos
	end

	if mainAttacker then
		robotPositions[mainAttacker] = mainAttacker.pos
	end

	local zoneList = {} // { zone }
	for _, zone in ipairs(self._zones) do
		visualizeZone(zone)
		table.insert(zoneList, zone)
	end

	local robotZones
	if mainAttacker and updateAssignments then
		robotZones = assignRobotsToZones(robotPositions, zoneList)// updateAssignments and <- or self._lastAssignments
	else
		robotZones = self._lastAssignments
	end

	debug.set("Midfield Zones", robotZones)

	if robotZones then
		for zone, robot in pairs(robotZones) do
			if remainingMidfielders <= 0 then
				break
			end
			sender.midfieldZone(robot, zone)
			remainingMidfielders = remainingMidfielders - 1
		end
	end

	self._lastMainAttacker = mainAttacker
	self._lastRobots = robots
	self._lastAssignments = robotZones
end

return Midfield
