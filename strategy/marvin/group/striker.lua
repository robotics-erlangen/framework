local Striker = Class("Group.Striker")

local debug = require "../base/debug"
local Field = require "../base/field"
local World = require "../base/world"
local G = World.Geometry

function Striker:init()
	self.name = "striker"
	self._robots = {}

	self._defaultPositions = {}

	self._zoneCount = 0
	self._prevZoneCount = nil
	self._unoccupiedZoneIndex = nil
	self._lastMainAttacker = nil
end

function Striker:_setDefaultPositions(zoneCount)
	local zoneWidth = G.FieldWidth / zoneCount
	for i = 1, zoneCount do
		local x = (math.random() * 0.8 + 0.1) * zoneWidth + (i - 1) * zoneWidth - G.FieldWidthHalf
		local y
		repeat
			y = math.random() * 0.9 * G.FieldHeightHalf
		until not Field.isInOpponentDefenseArea(Vector(x, y), 0.2)
		self._defaultPositions[i] = Vector(x, y)
	end
end

function Striker:run(sender, inbox, messages)
	self._robots = table.keys(messages)

	local mainAttacker = inbox.mainAttacker().trainer
	local mainAttackerPos = Vector(math.huge, math.huge)

	local zones = {}
	local zoneCount = #self._robots
	
	if mainAttacker and mainAttacker.pos.y > -G.FieldHeightHalf / 4 then
		mainAttackerPos = mainAttacker.pos
		zoneCount = zoneCount + 1
	end

	if zoneCount ~= self._prevZoneCount then
		self:_setDefaultPositions(zoneCount)
		self._prevZoneCount = zoneCount
	end


	-- calculate and visualize the zone boundaries and default positions
	local zoneWidth = G.FieldWidth / zoneCount
	for i = 1, zoneCount do
		local zoneLeft = -G.FieldWidthHalf + (i - 1) * zoneWidth
		local zoneRight = zoneLeft + zoneWidth
		local boundaries = { left = zoneLeft, right = zoneRight, top = G.FieldHeightHalf, bottom = 0 }
		table.insert(zones, {defaultPos = self._defaultPositions[i], boundaries = boundaries })
	end

	-- if the number of zones changes, invalidate the empty zone to get rid of the hysteresis
	if self._zoneCount ~= zoneCount then
		self._unoccupiedZoneIndex = nil
		self._zoneCount = zoneCount
	end

	-- calculate the zone index of the current mainAttacker
	-- this zone will stay empty
	local zoneWidthHysteresis = self._unoccupiedZoneIndex and 0.2 or 0
	for i = 1, zoneCount do
		local zone = zones[i]
		if mainAttackerPos.x >= zone.boundaries.left + zoneWidthHysteresis
				and mainAttackerPos.x <= zone.boundaries.right - zoneWidthHysteresis then
			self._unoccupiedZoneIndex = i
			break
		end
	end

	-- if the mainAttacker changes, assume that the previous mainAttacker becomes a striker instead
	local robotsTmp = {}
	for _, robot in ipairs(self._robots) do
		if robot == mainAttacker and self._lastMainAttacker then
			table.insert(robotsTmp, self._lastMainAttacker)
		else
			table.insert(robotsTmp, robot)
		end
	end
	self._robots = robotsTmp

	-- assign the zones to the nearest strikers (sorted by x position)
	local robotXPositions = {}
	for _, r in ipairs(self._robots) do
		local _, passInfoTable = next(inbox.passInfo())
		local xPos = r.pos.x
		if passInfoTable then
			for _, passInfo in ipairs(passInfoTable) do
				if passInfo.target == r then
					xPos = passInfo.ballPos.x
				end
			end
		end
		table.insert(robotXPositions, xPos)
	end
	local bubbleChange = true
	while bubbleChange do
		bubbleChange = false
		for i = 2, #robotXPositions do
			if robotXPositions[i] < robotXPositions[i - 1] then
				local tmpX = robotXPositions[i]
				local tmpR = self._robots[i]
				robotXPositions[i] = robotXPositions[i - 1]
				self._robots[i] = self._robots[i - 1]
				robotXPositions[i - 1] = tmpX
				self._robots[i - 1] = tmpR
				bubbleChange = true
			end
		end
	end

	local j = 1
	for i = 1, zoneCount do
		if i ~= self._unoccupiedZoneIndex then
			if j <= #self._robots then
				sender.strikerZone(self._robots[j], zones[i])
				j = j + 1
			end
		end
	end

	debug.set("number of zones", self._zoneCount)
	debug.set("empty zone index", self._unoccupiedZoneIndex)

	self._lastMainAttacker = mainAttacker
end

return Striker
