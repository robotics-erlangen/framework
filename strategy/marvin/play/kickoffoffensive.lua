local KickoffOffensive = (require "../base/class").new("Play.KickoffOffensive", require "play/base")

local Settings = require "settings"
local World = require "../base/world"
local RobotMatcher = require "control/robotmatcher"
local G = World.Geometry


KickoffOffensive.weight = 1000 -- TODO
KickoffOffensive.timeout = 20 -- TODO


function KickoffOffensive:_init()
	self._side = math.random(2) == 1 -- true = right, false = left
	log("KickoffOffensive: Formation "..(self._side and "Right" or "Left"))
	self:setState("Formation")
end

function KickoffOffensive.selectRobots(attackers, defenders)
	local robots = table.append(table.copy(attackers), defenders) -- use attackers AND defenders
	robots, _ = RobotMatcher.match(robots, 4, nil, nil) -- TODO use conditions if needed
	return robots
end

function KickoffOffensive:prepareFormation()
	-- #1 Ballie
	local balliePos = Vector.create(0, -World.Ball.radius - self._robots[1].radius - Settings.positionPadding)
	-- #2 Quarterback
	local quarterbackPos = Vector.create(0, -G.CenterCircleRadius - self._robots[2].radius - Settings.positionPadding)
	-- #3 Outer
	local outerPos = Vector.create((self._side and 1 or -1) * G.FieldWidthHalf * 0.75, -3 * self._robots[3].radius)
	-- #4 Inner
	local innerPos = Vector.create((self._side and 1 or -1) * G.FieldWidthHalf * 0.5, -3 * self._robots[4].radius)
	
	self._tasks = {
		Task.MoveToPos.create(self._robots[1], balliePos, math.pi/2),
		Task.MoveToPos.create(self._robots[2], innerPos, math.pi/2),
		Task.MoveToPos.create(self._robots[3], quarterbackPos, math.pi/2),
		Task.MoveToPos.create(self._robots[4], outerPos, math.pi/2),
	}
end

function KickoffOffensive:handleFormation()
	self._assignTasks(tasks)
	if World.RefereeState == "KickoffOffensive" then
		decideCase()
	end
end

function KickoffOffensive:prepareMidEmpty()
	self._tasks = {Task.ShootGoal.create(self._robots[1])} -- ballie shoots goal
end

function KickoffOffensive:handleMidEmpty()

end

function KickoffOffensive:prepareMajority()
	self._tasks = {
	-- 1: Laufpass an 2
	-- 2: Laufpass von 1 annehmen
	Task.MoveTo.create(self._robots[3] -- TODO: fertig machen
end

function KickoffOffensive:handleMajority()

end

function KickoffOffensive:prepareUseQuarterback()

end

function KickoffOffensive:handleUseQuarterback()

end

function KickoffOffensive:prepareDefault()

end

function KickoffOffensive:handleDefault()

end


local function KickoffOffensive:decideCase()
	 -- divide the field into three sectors
	 -- _________________________ <- opponent's goal line
	 -- |       |       |       |
	 -- |       |       |       |
	 -- |_______|   2   |_______|
	 -- |       |       |       |
	 -- |   1   |       |   3   |
	 -- |_______|_______|_______| <- center line
	 -- |                       |
	local sector = {0, 0, 0}
	local border = G.CenterCircleRadius + G.FieldWidthQuarter
	for _,robot in pairs(World.OpponentRobots) do --counts the opponent robots in each sector
		if robot.pos.y < border then
			if robot.pos.x < -G.CenterCircleRadius - robot.radius then
				sector[1] = sector[1] + 1
			elseif robot.pos.x > G.CenterCircleRadius + robot.radius then
				sector[3] = sector[3] + 1
			end
		end
		if robot.pos.x >= -G.CenterCircleRadius - robot.radius
		and robot.pos.x <= G.CenterCircleRadius + robot.radius then
			sector[2] = sector[2] + 1
		end
	end
	
	if sector[2] == 0 then -- middle sector empty
		self:setState("MidEmpty")
		log("KickoffOffensive: Middle Sector empty => Attack in the Middle")
	elseif sector[self.side and 3 or 1] <= 1 -- 2v0 or 2v1
		self:setState("Majority")
		log("KickoffOffensive: 2v"..sector[self.side and 3 or 1].." => Attack on the "..(self.side and "Right" or "Left").." side")
	elseif sector[self.side and 1 or 3] == 0 -- other side empty
		self:setState("UseQuarterback")
		log("KickoffOffensive: "..(self.side and "Left" or "Right").." side empty => Use quarterback")
	else -- care only for robots that are close to us
		self:setState("Default")
		log("KickoffOffensive: "..sector[1].." Left, "..sector[2].." Middle, "..sector[3].." Right => Default Attack")
	end		
end
