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

local function compareRobotsByXPos(r1, r2)
	return r1.pos.x < r2.pos.x
end

function Striker:run(sender, inbox, messages)
	self._robots = table.keys(messages)

	local zones = {}
	local zoneCount = #self._robots + 1
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
	for i = 1, zoneCount - 1 do
		local x = i * zoneWidth - G.FieldWidthHalf
		local points = {Vector(x, 0), Vector(x, G.FieldHeightHalf)}
	end

	-- if the number of zones changes, invalidate the empty zone to get rid of the hysteresis
	if self._zoneCount ~= zoneCount then
		self._unoccupiedZoneIndex = nil
		self._zoneCount = zoneCount
	end

	-- calculate the zone index of the current mainAttacker
	-- this zone will stay empty
	local mainAttacker = inbox.mainAttacker().trainer
	local mainAttackerPos = mainAttacker and mainAttacker.pos or World.Ball.pos
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
	table.sort(self._robots, compareRobotsByXPos)
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
