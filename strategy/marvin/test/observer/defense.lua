local DefenseTest = {}

local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local Defense = require "util/defense"

function DefenseTest.testDangerousness()
	local ratings = Defense.rateOpponentDangerousness()
	for robot, rating in pairs(ratings) do
		local red = math.bound(0, 255 * rating, 255)
		local green = math.bound(0, 255 * (1- rating), 255)
		local color = vis.fromRGBA(red, green, 0, 128)
		vis.addCircle("test: Dangerousness", robot.pos, 0.2, color, true)
	end
end

return DefenseTest
