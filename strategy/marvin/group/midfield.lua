local Midfield = Class("Group.Midfield")

local Constants = require "../base/constants"
local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

function Midfield:init()
	self.name = "midfield"

	self._farAwayHyst = false -- the ball is far in our own half and we need midfielders to move forward
	self._noMidfielderHyst = false -- we are attacking the goal and dont want midfielders at all

	self._zones = {}

	self._lastMainAttacker = nil
	self._lastRobots = nil
	self._lastAssignments = nil
end

local function getDefaultPosition(boundaries)
	local zoneWidth = math.abs(boundaries.right - boundaries.left)
	local zoneHeight = math.abs(boundaries.top - boundaries.bottom)
	return Vector(boundaries.right - zoneWidth/2, boundaries.bottom + zoneHeight/2)
end

local function visualizeZone(zone)
	local visFlag = false

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

	local totalLeft = -G.FieldWidthHalf
	local totalRight = G.FieldWidthHalf

	local remainingZones = nMidfielders

	local robotRadius = Constants.maxRobotRadius
	local zoneWidth = 2
	local offset = 1.4

	-- three hardcoded zones, depending on the number of robots we have
	if remainingZones >= 1 then
		local zone = {}
		zone.boundaries = {
			bottom = -2,
			top = 2,
			left = totalLeft + robotRadius + offset,
			right = totalLeft + robotRadius + offset + zoneWidth
		}
		zone.defaultPos = getDefaultPosition(zone.boundaries)
		remainingZones = remainingZones - 1
		table.insert(self._zones, zone)
	end

	if remainingZones >= 1 then
		local zone = {}
		zone.boundaries = {
			bottom = -2,
			top = 2,
			right = totalRight - robotRadius - offset,
			left = totalRight - robotRadius - offset - zoneWidth
		}
		zone.defaultPos = getDefaultPosition(zone.boundaries)
		remainingZones = remainingZones - 1
		table.insert(self._zones, zone)
	end

	if remainingZones >= 1 then
		local zone = {}
		zone.boundaries = {
			bottom = 2,
			top = 2,
			right = zoneWidth/2,
			left = -zoneWidth/2
		}
		zone.defaultPos = getDefaultPosition(zone.boundaries)
		table.insert(self._zones, zone)
	end
end



function Midfield:run(sender, inbox, messages)
	local robots = table.keys(messages)
	local mainAttacker = inbox.mainAttacker().trainer

	-- update assignments if necessary
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

	if #robots ~= self._lastRobots then
		self:_updateZones(remainingMidfielders)
	end

	-- assign the zones to the nearest Midfields
	local robotPositions = {} -- robot -> pos
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

	local zoneList = {} -- { zone }
	for _, zone in ipairs(self._zones) do
		visualizeZone(zone)
		table.insert(zoneList, zone)
	end

	local robotZones
	if mainAttacker and updateAssignments then
		robotZones = assignRobotsToZones(robotPositions, zoneList)-- updateAssignments and <- or self._lastAssignments
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
