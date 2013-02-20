local ShootGoal = (require "../base/class").new("Task.ShootGoal", require "task/base")

local World = require "../base/world"
local Observer = {}
--Observer.Ball = require "observer/ball"
Observer.Goal = require "observer/goal"
Observer.Shoot = require "observer/shoot"
local geom = require "../base/geom"
local ToTarget = require "trajectory/totarget"

ShootGoal.priority = 5

function ShootGoal:_init()
end

local mode, bestRating, bestSector = 0, 0, 1
function ShootGoal:rating()	-- bewertet momentan nur, wie wahrscheinlich es ist, aus der jetzigen Position ein Tor zu schieﬂen
	local ball = World.Ball
	local robots = {}
	for _,r in ipairs(World.Robots) do
		if r.pos.y > ball.pos.y then
			if r ~= self._robot then
				table.insert(robots, r)
			end
		end
	end
	local freeSectors = Observer.Goal.freeSectors(ball.pos, robots, true)
	for k, fs in ipairs(freeSectors) do -- TODO: gescheite Funktion implementieren, die die Zeit absch‰tzt, die der Roboter braucht, um sich mit dem Ball um einen bestimmten Winkel zu drehen
		local rating = (fs[2] - fs[1])*(10 - geom.getAngleDiff(self._robot.dir, 0.5*(fs[1] + fs[2]))^2) -- wie gesagt, nur ganz grobe Absch‰tzung der Qualit‰t eines Sektors
		if rating > bestRating then
			bestRating = rating
			bestSector = k
		end
	end
	if bestRating > 1.5 then
		if bestSector[0] < self._robot.dir and self._robot.dir < bestSector[1] then
			local pointOnGoalLine, _, _ = geom.intersectLineLine(self._robot.pos, self._robot.dir, World.Geometry.OpponentGoal, 0)
			if Observer.Shoot.evaluateShootCorridor(pointOnGoalLine, self._robot.maxShotLinear, ball.pos, 0, robots) > 0.92836 then	-- warning! magic constant
				mode = 3	-- sofort schieﬂen
			else
				mode = 2	-- bisschen drehen dann schieﬂen (nur dann entscheidend, falls es eine Mˆglichkeit gibt, im Drehen zu schieﬂen)
			end
		else
			mode = 1		-- drehen, dann schieﬂen
		end
	else
		mode = 0			-- erst denken, dann fahren, dann denken, dann vielleicht schieﬂen
	end
	return bestRating
end

function ShootGoal:_run(priorityMessages, notifications)
	if mode == 3 then
		self._robot:shoot(0, math.huge)
	elseif mode == 2 then
		self._robot.trajectory:update(ToTarget, self._robot.pos, (bestSector[0] + bestSector[1])*0.5)
	elseif mode == 1 then
		self._robot.trajectory:update(ToTarget, self._robot.pos, (bestSector[0] + bestSector[1])*0.5)
	else
	
	end
end

return ShootGoal