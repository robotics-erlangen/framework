local Base = require "play/base"
local KickoffOffensive = (require "../base/class").new("Play.KickoffOffensive", Base)

local Assistant = require "task/assistant"
local MoveToPos = require "task/movetopos"
local World = require "../base/world"
local RobotMatcher = require "control/robotmatcher"
local RobotList = require "util/robotlist"
local G = World.Geometry


KickoffOffensive.weight = 1000 -- TODO
KickoffOffensive.timeout = 20 -- TODO

KickoffOffensive._conditions = {} -- TODO use conditions if needed

function KickoffOffensive:_init()
	self._side = math.random(2) == 1 -- true = right, false = left
	log("KickoffOffensive: Formation "..(self._side and "Right" or "Left"))
	self:setState("Formation")
end

function KickoffOffensive.startRating(attackers, defenders, minRating)
	-- ignore minRating because rating is either no or referee
	if #attackers < 1 then
		return Base.rating.no
	end
	if World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive" then
		return Base.rating.referee
	else
		return Base.rating.no
	end
end

function KickoffOffensive:currentRating()
	if World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive" then
		return Base.rating.referee
	elseif World.RefereeState == "Game" then
		-- TODO: 
		-- Bewertungsfunktionen implementieren:
		--	Der Play bricht sich ab (Bewertung -> Nein), wenn wir geschossen haben und
		--		1. Wir den Ball wieder haben
		--		2. Der Gegner den Ball hat
		--		3. Der Gegner den Ball haben wird
		--	ansonsten ja
		return Base.rating.no -- FIXME FIXME FIXME
	else
		return Base.rating.no
	end
end

function KickoffOffensive.selectRobots(attackers, defenders)
	-- cacheable array manipulations
	local robots = RobotList.join(attackers, defenders)
	robots = RobotList.excludeRobot(robots, World.FriendlyKeeper)
	
	robots, _ = RobotMatcher.match(robots, math.min(4, #robots), KickoffOffensive._conditions)
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
		self._robots[1] and MoveToPos.create(self._robots[1], balliePos, math.pi/2) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], innerPos, math.pi/2) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], quarterbackPos, math.pi/2) or nil,
		self._robots[4] and MoveToPos.create(self._robots[4], outerPos, math.pi/2) or nil,
	}
end

function KickoffOffensive:switchFormation()
	if World.RefereeState == "KickoffOffensive" then
		self:decideCase()
	end
end

--[[
	TODO
		- aufs regelkonforme Timing achten:
			Roboter sollen nicht vorm ersten Schuss über die Mittellinie fahren
			Idee: vor dem Schuss die gegnerische Spielfeldhälfte als Hindernis übergeben?
			TESTEN!
		- Pässe implementieren
			Anstoß soll möglichst ohne Verzögerung passieren!
			Startbewertungskategorien: Schiedsrichter, Nein
			Laufbewertungskategorien: Schiedsrichter, Ja (bei Befehl = Game), Nein
--]]

function KickoffOffensive:prepareMidEmpty()
	self._tasks = {self._robots[1] and Task.ShootGoal.create(self._robots[1]) or nil} -- ballie shoots goal
end

function KickoffOffensive:prepareMajority()
	local mirroredTargetPos = Vector.create((self.side and -1 or 1)*G.FieldWidthQuarter, G.FieldHeightQuarter)
	local backPos = Vector.create((self.side and 1 or -1)*G.FieldWidthQuarter, -10*self._robots[1].radius)
	self._tasks = {
		-- 1: Laufpass an 2
		-- 2: Laufpass von 1 annehmen
		self._robots[3] and Task.Assistant.create(self._robots[3], mirroredTargetPos, G.FieldWidthQuarter) or nil,
		self._robots[4] and MoveToPos.create(self._robots[4], backPos, math.pi/2) or nil,
	}
end

function KickoffOffensive:prepareUseQuarterback()
	local mirroredTargetPos = Vector.create((self.side and 1 or -1)*G.FieldWidthQuarter, G.FieldHeightQuarter)
	local backPos = Vector.create((self.side and 1 or -1)*G.FieldWidthQuarter, -10*self._robots[1].radius)
	self._tasks = {
		--1: Laufpass an 3
		self._robots[2] and MoveToPos.create(self._robots[2], backPos, math.pi/2) or nil,
		--3: Laufpass von 1 annehmen
		self._robots[4] and Task.Assistant.create(self._robots[4], mirroredTargetPos, G.FieldWidthQuarter),
	}
end

function KickoffOffensive:prepareDefault()
	local mirroredTargetPos = Vector.create((self.side and -1 or 1)*G.FieldWidthQuarter, G.FieldHeightQuarter)
	local backPos = Vector.create((self.side and 1 or -1)*G.FieldWidthQuarter, -10*self._robots[1].radius)
	self._tasks = {
		-- 1: Laufpass an 4
		self._robots[2] and MoveToPos.create(self._robots[2], backPos, math.pi/2) or nil,
		self._robots[3] and Task.Assistant.create(self._robots[3], mirroredTargetPos, G.FieldWidthQuarter) or nil,
		-- 4: Laufpass von 1 annehmen
	}
end


function KickoffOffensive:decideCase()
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
	elseif sector[self.side and 3 or 1] <= 1 then -- 2v0 or 2v1
		self:setState("Majority")
		log("KickoffOffensive: 2v"..sector[self.side and 3 or 1].." => Attack on the "..(self.side and "Right" or "Left").." side")
	elseif sector[self.side and 1 or 3] == 0 then -- other side empty
		self:setState("UseQuarterback")
		log("KickoffOffensive: "..(self.side and "Left" or "Right").." side empty => Use quarterback")
	else -- care only for robots that are close to us
		self:setState("Default")
		log("KickoffOffensive: "..sector[1].." Left, "..sector[2].." Middle, "..sector[3].." Right => Default Attack")
	end		
end

return KickoffOffensive
