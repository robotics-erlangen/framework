-- Your assignment is to get three robots to move along a triangular shape. 
-- Use the MoveToPos-Task to do this. MoveToPos needs a Vector as parameter and will move to that position. 
-- In order to start this move in Ra, click the "main" button in the robots-widget to open a drop-down menu,
-- then locate "MoveTest" -> "Tutorial"

-- Hints:
-- 	- you can find a commented stub of a move under "marvin/test/move/movestub.lua"
-- 	- self._robot[i].pos returns the current position of the i-th robot
-- 	- indices in lua tables start with 1, NOT 0
-- 	- keep in mind that it may take varying time for the robots to arrive at their initial positions
-- 	- you can use other moves as reference material, they are located in the folder marvin/group/move
-- 	- there's no need to change the canStart and canContinue functions (as the tutorial only runs this move)
-- 	- as this stub is incomplete, it will currently crash instantly when run
-- 	- as soon as the robots get valid assignments this should no longer happen


-- We know the framework looks scaaaaryyyy, it takes a while to familiarize yourself with it,
-- so don't hesitate to ask questions ;)

local MoveSRC1 = Class("Group.Move.MoveSRC1", require "group/move/base")

local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local Ball = require "observer/ball"
local ShootGoal = require "task/shootgoal" 
local World =   require "../base/world"



MoveSRC1.MIN_ROBOTS = 5
MoveSRC1.MAX_ROBOTS = 5

function MoveSRC1.canStart() --Klassenmethode
	return true
end

function MoveSRC1:_init() -- Instanzmethode
	self._init = true
	self._state = 1
	self._gepasst = 1
	self._xFactor = World.Geometry.FieldWidthHalf / 3
	self._yFactor = World.Geometry.FieldHeightHalf / 4.5
	self._posInit = {Vector(-1.5 * self._xFactor, 3.5 * self._yFactor), Vector(-0.7 * self._xFactor, 2.5 * self._yFactor), Vector(0.5 * self._xFactor, 0.9 * self._yFactor), Vector(3.0 * self._xFactor, 3.8 * self._yFactor), Vector(0.4 * self._xFactor, -3.4 * self._yFactor)}
	self._pos1 = {Vector(-1.5 * self._xFactor, 3.5 * self._yFactor), Vector(-1.5 * self._xFactor, 3.5 * self._yFactor), Vector(-1.4 * self._xFactor, 2.9 * self._yFactor), Vector(-1.01 * self._xFactor, 1.47 * self._yFactor), Vector(0.6 * self._xFactor, -3.4 * self._yFactor)}
	self._pos2 = {Vector(-0.7 * self._xFactor, 2.5 * self._yFactor), Vector(-0.7 * self._xFactor, 2.5 * self._yFactor), Vector(-1.7 * self._xFactor, 3.6 * self._yFactor), Vector(-2.7 * self._xFactor, 2.0 * self._yFactor), Vector(0.3 * self._xFactor, -2.9 * self._yFactor)}
	self._pos3 = {Vector(0.5 * self._xFactor, 0.9 * self._yFactor), Vector(2.5 * self._xFactor, 2.7 * self._yFactor), Vector(2.5 * self._xFactor, 2.7 * self._yFactor), Vector(0.6 * self._xFactor, 3.0 * self._yFactor), Vector(0.4 * self._xFactor, 3.0 * self._yFactor)}--Im Weg
	self._pos4 = {Vector(3.0 * self._xFactor, 3.8 * self._yFactor), Vector(3.0 * self._xFactor, 4.5 * self._yFactor), Vector(3.0 * self._xFactor, 4.5 * self._yFactor), Vector(3.0 * self._xFactor, 4.5 * self._yFactor), Vector(3.0 * self._xFactor, 4.5 * self._yFactor)}
	self._pos5 = {Vector(0.4 * self._xFactor, -3.4 * self._yFactor), Vector(0.4 * self._xFactor, -3.4 * self._yFactor), Vector(0.14 * self._xFactor, 1.2 * self._yFactor), Vector(-0.04 * self._xFactor, 1.7 * self._yFactor), Vector(-0.04 * self._xFactor, 1.7 * self._yFactor)}
	
end


function MoveSRC1:_canContinue()

	return (self._gepasst < 3)
	--beenden wenn gepasst
end

	local state = 0
	local changed = false

function MoveSRC1:_updateTasks()
	local taskAssignments = {}
	
	if self._robots[1].pos:distanceTo(self._pos1[(state % 5) +1]) < 0.1 and self._robots[2].pos:distanceTo(self._pos2[(state % 5) +1]) < 0.1 and self._robots[3].pos:distanceTo(self._pos3[(state % 5) +1]) < 0.1 and self._robots[4].pos:distanceTo(self._pos4[(state % 5) +1]) < 0.1 and self._robots[5].pos:distanceTo(self._pos5[(state % 5) +1]) < 0.1 
--		or (state % 5) == 3 and self._robots[1].pos:distanceTo(self._pos1[(state % 5) +1]) < 0.1 and self._robots[2].pos:distanceTo(self._pos2[(state % 5) +1]) < 0.1 and self._robots[3].pos:distanceTo(self._pos3[(state % 5) +1]) < 0.1 and self._robots[5].pos:distanceTo(self._pos5[(state % 5) +1]) < 0.1	
		or Ball.isShot() then
		state = (state + 1 ) 
		changed = true
		if state % 5 >= 3 then
			self._gepasst = self._gepasst + 1
		end
	end
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {self._pos1[(state % 5) +1]}, restart = changed}--task wird eigentlich nicht neu gestartet, wenn es der gleiche bleibt (Performanz)
		taskAssignments[self._robots[2]] = {class = MoveToPos, params = {self._pos2[(state % 5) +1]}, restart = changed}--Die Parameter, die uebergeben werden, gehen an init
		taskAssignments[self._robots[3]] = {class = MoveToPos, params = {self._pos3[(state % 5) +1]}, restart = changed}--da sich aber parameter ändern sollen, muss der task also neu initialisiert werden, damit die Parameter sich aendern, dafuer restart = true
	if (state%5) == 3 then
		taskAssignments[self._robots[4]] = {class = Pass, params = {self._robots[5]}, restart = changed}
		
	else
		taskAssignments[self._robots[4]] = {class = MoveToPos, params = {self._pos4[(state % 5) +1]}, restart = changed}
	end
	if (state %5) == 4 then
		taskAssignments[self._robots[5]] = {class = ShootGoal, params = {}, restart = changed}
		
	else
		taskAssignments[self._robots[5]] = {class = MoveToPos, params = {self._pos5[(state % 5) +1]}, restart = changed}
	end
		changed = false

	if self._init == false then
		for i in ipairs(self._robots) do
			taskAssignments[self._robots[i]] = { class = MoveToPos, params = {self._posInit[i]}}
		end
		if self._robots[1].pos:distanceTo(self._posInit[1]) < 0.1 and self._robots[2].pos:distanceTo(self._posInit[2]) < 0.1 and	self._robots[3].pos:distanceTo(self._posInit[3]) < 0.1 and	self._robots[4].pos:distanceTo(self._posInit[4]) < 0.1 and self._robots[5].pos:distanceTo(self._posInit[5]) < 0.1 then
			self._init = true
			self._state = 1
		end
	end 
	
	if state%5 == 3 then
		return taskAssignments, self._robots[4] --dadurch wird robot i/4 zum main attacker
	end
	if state%5 == 4 then
		return taskAssignments, self._robots[5]
	end
	return taskAssignments
	--wenn gepasst also isShot dann noch einen frame lang main attacker und taskassignments und dann ende
	
end
--intellij /for java
return MoveSRC1
