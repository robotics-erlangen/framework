local DefenseTest = {}

local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local Defense = require "util/defense"

function DefenseTest.testDangerousness()
	local ratings = Defense.rateOpponentDangerousness()
	for robot, rating in pairs(ratings) do
		vis.addCircle("test: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true)
	end
end

return DefenseTest
