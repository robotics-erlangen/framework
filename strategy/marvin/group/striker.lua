local Striker = Class("Group.Striker")

local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

function Striker:init()
	self.name = "striker"
	self._robots = {}

	self._zoneCount = 0
	self._unoccupiedZoneIndex = nil
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

	for i = 1, zoneCount do
		local x = i * zoneWidth - G.FieldWidthHalf - zoneWidthHalf
		local y = G.FieldHeightQuarter + x * x / (G.FieldHeightQuarter * G.FieldHeightQuarter)
		vis.addCircle("g/striker", Vector(x, y), 0.1, vis.colors.slateHalf, true)

		local boundaries = { left = x - zoneWidthHalf, right = x + zoneWidthHalf,
			top = G.FieldHeightHalf, bottom = 0 }
		table.insert(zones, {defaultPos = Vector(x, y), boundaries = boundaries })
	end
	for i = 1, zoneCount - 1 do
		local x = i * zoneWidth - G.FieldWidthHalf
		local points = {Vector(x, 0), Vector(x, G.FieldHeightHalf)}
		vis.addPath("g/striker", points, vis.colors.slateHalf, nil, nil, 0.02)
	end

	if self._zoneCount ~= zoneCount then
		self._unoccupiedZoneIndex = nil
		self._zoneCount = zoneCount
	end

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
end

return Striker
