local ShootGoal = (require "../base/class").new("Task.ShootGoal", require "task/base")

local World = require "../base/world"
local Observer = {}
--Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
--Observer.Shoot = require "observer/shoot"

ShootGoal.priority = 5

function ShootGoal:_init()
end

local bestRating, bestSector = 0, 1
function ShootGoal:rating()	-- bewertet momentan nur, wie wahrscheinlich es ist, aus der jetzigen Position ein Tor zu schießen
	local robots = {}
	for _,r in ipairs(World.Robots) do
		if r.pos.y > ball.pos.y then
			table.insert(robots, r)
		end
	end
	local freeSectors = Observer.Goal.freeSectors(ball.pos, robots, true)
	for k, fs in ipairs(freeSectors) do -- TODO: gescheite Funktion implementieren, die die Zeit abschätzt, die der Roboter braucht, um sich mit dem Ball um einen bestimmten Winkel zu drehen
		local rating = (fs[2] - fs[1])*(10 - geom.getAngleDiff(ballOwner.dir, 0.5*(fs[1] + fs[2]))^2) -- wie gesagt, nur ganz grobe Abschätzung der Qualität eines Sektors
		if rating > bestRating then
			bestRating = rating
			bestSector = k
		end
	end
	return bestRating
end

function ShootGoal:_run(priorityMessages, notifications)
	
end

return ShootGoal