local Striker = Class("Group.Striker")

local World = require "../base/world"
local G = World.Geometry

function Striker:init()
	self.name = "striker"
	self._robots = {}

	self._zoneCount = 0
	self._unoccupiedZoneIndex = nil
	self._lastMainAttacker = nil
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

	local zoneWidth = G.FieldWidth / zoneCount
	local zoneWidthHalf = zoneWidth * 0.5

	-- calculate and visualize the zone boundaries and default positions
	for i = 1, zoneCount do
		local x = i * zoneWidth - G.FieldWidthHalf - zoneWidthHalf
		local y = G.FieldHeightQuarter + x * x / (G.FieldHeightQuarter * G.FieldHeightQuarter)

		local boundaries = { left = x - zoneWidthHalf, right = x + zoneWidthHalf,
			top = G.FieldHeightHalf, bottom = 0 }
		table.insert(zones, {defaultPos = Vector(x, y), boundaries = boundaries })
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
		local _, passInfo = next(inbox.passInfo())
		local xPos = (passInfo and passInfo.target == r) and passInfo.ballPos.x or r.pos.x
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

	self._lastMainAttacker = mainAttacker
end

return Striker
