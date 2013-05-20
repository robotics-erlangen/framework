local Base = require "play/base"
local KickoffOffensive = (require "../base/class").new("Play.KickoffOffensive", Base)

local Assistant = require "task/assistant"
local MoveToPos = require "task/movetopos"
local ShootGoal = require "task/shootgoal"

local World = require "../base/world"
local Game = require "observer/game"
local RobotMatcher = require "control/robotmatcher"
local RobotList = require "util/robotlist"
local G = World.Geometry


KickoffOffensive.weight = 1000 -- TODO
KickoffOffensive.timeout = 20 -- TODO
KickoffOffensive.maxRating = Base.rating.referee

KickoffOffensive._conditions = {} -- TODO use conditions if needed

function KickoffOffensive:_init()
end

local function currentRating()
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
	end
	
	return Base.rating.no
end

function KickoffOffensive:_selectRobots(poolRobots)
	-- cacheable array manipulations
	local robots = RobotList.join(poolRobots.attack, poolRobots.defense)
	return RobotMatcher.match(self._messages, robots, math.max(math.min(4, #robots), 1), KickoffOffensive._conditions)
end


function KickoffOffensive:rateDefault(isInit) 
	return currentRating()	
end 

function KickoffOffensive:prepareDefault()
	self._side = math.random(2) == 1 -- true = right, false = left
	--log("KickoffOffensive: Formation "..(self._side and "Right" or "Left"))


	local balliePos, quarterbackPos, outerPos, innerPos
	-- #1 Ballie
	balliePos = Vector.create(0, -World.Ball.radius - self._robots[1].radius - Settings.positionPadding)
	-- #2 Quarterback
	if self._robots[2] then
		quarterbackPos = Vector.create(0, -G.CenterCircleRadius - self._robots[2].radius - Settings.positionPadding)
	end
	-- #3 Outer
	if self._robots[3] then
		outerPos = Vector.create((self._side and 1 or -1) * G.FieldWidthHalf * 0.75, -3 * self._robots[3].radius)
	end
	-- #4 Inner
	if self._robots[4] then
		innerPos = Vector.create((self._side and 1 or -1) * G.FieldWidthHalf * 0.5, -3 * self._robots[4].radius)
	end
	self._tasks = {
		self._robots[1] and MoveToPos.create(self._robots[1], balliePos, math.pi/2) or nil,
		self._robots[2] and MoveToPos.create(self._robots[2], quarterbackPos, math.pi/2) or nil,
		self._robots[3] and MoveToPos.create(self._robots[3], outerPos, math.pi/2) or nil,
		self._robots[4] and MoveToPos.create(self._robots[4], innerPos, math.pi/2) or nil,
	}
end

function KickoffOffensive:switchDefault()
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

function KickoffOffensive:rateMidEmpty() 
	return currentRating()
end 

function KickoffOffensive:prepareMidEmpty()
	-- TODO: activate and test
	self._tasks = {self._robots[1] and ShootGoal.create(self._robots[1]) or nil} -- ballie shoots goal
end

function KickoffOffensive:rateMajority() 
	return currentRating()
end 

function KickoffOffensive:prepareMajority()
	local mirroredTargetPos = Vector.create((self._side and -1 or 1)*G.FieldWidthQuarter, G.FieldHeightQuarter)
	local backPos = Vector.create((self._side and 1 or -1)*G.FieldWidthQuarter, -10*self._robots[1].radius)
	self._tasks = {
		-- TODO: 1: Laufpass an 2
		-- TODO: 2: Laufpass von 1 annehmen
		self._robots[3] and Assistant.create(self._robots[3], mirroredTargetPos, G.FieldWidthQuarter) or nil,
		self._robots[4] and MoveToPos.create(self._robots[4], backPos, math.pi/2) or nil,
	}
end

function KickoffOffensive:rateUseQuarterback() 
	return currentRating()
end 

function KickoffOffensive:prepareUseQuarterback()
	local mirroredTargetPos = Vector.create((self._side and 1 or -1)*G.FieldWidthQuarter, G.FieldHeightQuarter)
	local backPos = Vector.create((self._side and 1 or -1)*G.FieldWidthQuarter, -10*self._robots[1].radius)
	self._tasks = {
		-- TODO: 1: Laufpass an 3
		self._robots[2] and MoveToPos.create(self._robots[2], backPos, math.pi/2) or nil,
		-- TODO: 3: Laufpass von 1 annehmen
		self._robots[4] and Assistant.create(self._robots[4], mirroredTargetPos, G.FieldWidthQuarter),
	}
end

function KickoffOffensive:prepareDefaultOffense(isInit) 
	return currentRating()
end

function KickoffOffensive:prepareDefaultOffense()
	local mirroredTargetPos = Vector.create((self._side and -1 or 1)*G.FieldWidthQuarter, G.FieldHeightQuarter)
	local backPos = Vector.create((self._side and 1 or -1)*G.FieldWidthQuarter, -10*self._robots[1].radius)
	self._tasks = {
		-- TODO: 1: Laufpass an 4
		self._robots[2] and MoveToPos.create(self._robots[2], backPos, math.pi/2) or nil,
		self._robots[3] and Assistant.create(self._robots[3], mirroredTargetPos, G.FieldWidthQuarter) or nil,
		-- TODO: 4: Laufpass von 1 annehmen
	}
end


function KickoffOffensive:decideCase()
	local sector1list, sector2list, sector3list = Game.divideOpponentsIntoSectors(true)
	local sector1, sector2, sector3 = #sector1list, #sector2list, #sector3list

	if sector2 == 0 then -- middle sector empty
		self:_setState("MidEmpty")
		log("KickoffOffensive: Middle Sector empty => Attack in the Middle")
	elseif self._side and sector3 or sector1 <= 1 then -- 2v0 or 2v1
		self:_setState("Majority")
		log("KickoffOffensive: 2v"..(self._side and sector3 or sector1).." => Attack on the "..(self._side and "Right" or "Left").." side")
	elseif self._side and sector1 or sector3 == 0 then -- other side empty
		self:_setState("UseQuarterback")
		log("KickoffOffensive: "..(self._side and "Left" or "Right").." side empty => Use quarterback")
	else -- care only for robots that are close to us
		self:_setState("DefaultOffense")
		log("KickoffOffensive: "..sector1.." Left, "..sector2.." Middle, "..sector3.." Right => Default Attack")
	end		
end

return KickoffOffensive
