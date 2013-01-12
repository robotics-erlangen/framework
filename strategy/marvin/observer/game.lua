local Game = {}

-- TODO: use caching
-- TODO: check for unexpected changes


local World = require "../base/world"
local G = World.Geometry


function Game.devideOpponentsIntoSectors(ignoreCorners)
	 -- divide the field into three sectors
	 -- _________________________ <- opponent's goal line
	 -- |       |       |       |
	 -- |       |       |       |
	 -- |_______|   2   |_______|
	 -- |       |       |       |
	 -- |   1   |       |   3   |
	 -- |_______|_______|_______| <- center line
	 -- |                       |
	local sector1, sector2, sector3 = {}, {}, {}
	local border = G.CenterCircleRadius + G.FieldWidthQuarter
	for _,robot in pairs(World.OpponentRobots) do
		if robot.pos.y < border or not ignoreCorners then
			if robot.pos.x < -G.CenterCircleRadius - robot.radius then
				table.insert(sector1, robot)
			elseif robot.pos.x > G.CenterCircleRadius + robot.radius then
				table.insert(sector3, robot)
			end
		end
		if robot.pos.x >= -G.CenterCircleRadius - robot.radius
		and robot.pos.x <= G.CenterCircleRadius + robot.radius then
			table.insert(sector2, robot)
		end
	end
	return sector1, sector2, sector3
end


return Game
