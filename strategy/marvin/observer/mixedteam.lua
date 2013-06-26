local World = require "../base/world"
local Robot = require "observer/robot"
local Goal = require "observer/goal"

local MixedTeam = {}

--- sets global(!!) variable 'partnerTeamDidntTouch' to false if a partner robot has touched the ball
-- Adjust partner team with roboter-ids manually!
function MixedTeam.noPartnerTouched()
	-- reset on stop
	if World.RefereeState == "Halt" or World.RefereeState == "Stop" then
		partnerTeamDidntTouch = true
	end

	-- check if a partner touched the ball 
	for _, robot in ipairs(World.FriendlyRobots) do
		for _, i in ipairs(Settings.partnerRobots) do
			if robot.id == i then
				if robot.pos:distanceTo(World.Ball.pos) <= robot.radius + Settings.positionPadding then
					partnerTeamDidntTouch = false
				end
			end		
		end
	end

end

local function ratePartner(robot)
	local fs = Goal.freeSectors(robot.pos, World.OpponentRobots, true)
	local biggestSector = table.max(table.map(fs, function(s) return s[2]-s[1] end))
	local goalDist = robot.pos:distanceTo(World.Geometry.OpponentGoal)
	local rating = World.Geometry.FieldHeight - goalDist
	if biggestSector then
		rating = rating + biggestSector * 2 * World.Geometry.FieldHeight
	end
	-- log("robot " .. robot.id .. ", rating " .. rating)	
	return rating
end

function MixedTeam.bestPassPartner(fromRobot)	
	local partners = {}
	for _, id in ipairs(settings.partnerRobots) do
		if FriendlyRobotsById[id].isVisible then
			table.insert(partners, FriendlyRobotsById[id])
		end
	end
	table.sort(partners, function(r1, r2) return ratePartner(r1) > ratePartner(r2) end)
	local backupPartner = partners[1]
	local passablePartners = table.filter(partners, function(r) 
			return Robot.wayToRobotFree(r, fromRobot) 
		end)
	if passablePartners[1] then
		return passablePartners[1]
	else
		return backupPartner
	end
end

return MixedTeam