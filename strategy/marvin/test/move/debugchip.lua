local DebugChip = Class("Test.Move.DebugChip", require "group/move/base")

local DebugCommands = require "../base/debugcommands"
local Plotter = require "../base/plot"
local World = require "../base/world"
local ChipTask = require "task/debugchip"
local Ball = require "observer/ball"
local Physics = require "observer/physics"

DebugChip.MIN_ROBOTS = 1
DebugChip.MAX_ROBOTS = 1

local distance = nil
function DebugChip.canStart()
	return true
end

function DebugChip:_init()
	assert(amun.isDebug, "This move has to be run in debug mode!")
	self._idlePos = Vector (0, -3)
	self._restartFlag = false
	self._distance = nil
	self._initBall = {
		pos = self._idlePos + Vector.fromAngle(math.pi/2):setLength(self._robots[1].radius + self._robots[1].shootRadius),
		posZ = 0,
		speed = Vector(0,0),
		speedZ = 0
	}

	local time = World.Time 
	self._testStart = time
	self._lastTimestamp = time
	self._wasShot = false
	self._lastBall = World.Ball
	self._earlyBallTable = {}

	-- TODO more testcases

	self:_resetChip()	
end

function DebugChip:_canContinue()
	return true
end

function DebugChip:_resetChip()
	self._restartFlag = true
	if not distance then
		distance = 1
	elseif distance > 4 then
		log("Test finished. See plotter and debug tree for results")
		self._restartFlag = false
	else
		distance = distance + 0.25
	end

	log("dist: "..tostring(distance))
	log("")
	
	if self._restartFlag then
		local time = World.Time 
		self._testStart = time
		self._lastTimestamp = time
		self._wasShot = false
		self._lastBall = World.Ball
		self._earlyBallTable = {}
		DebugCommands.moveObjects(self._initBall)
	end
end

function DebugChip:_plotError(ballOld, time, string)
		local ballNew = World.Ball
		local predictedBall = Physics.ballAtTime(ballOld, time)

		if predictedBall then
			local horizontalError = ballNew.pos:distanceTo(predictedBall.pos)
			Plotter.addPlot("DebugChip."..string..".horizontalError", horizontalError)

			local horizontalSpeedError = math.abs(ballNew.speed:length() - predictedBall.speed:length())
			Plotter.addPlot("DebugChip."..string..".horizontalSpeedError", horizontalSpeedError)

			if predictedBall.posZ then
				local verticalError = math.abs(ballNew.posZ - predictedBall.posZ)
				Plotter.addPlot("DebugChip."..string..".verticalError", verticalError)

				local verticalSpeedError = math.abs(ballNew.posZ, predictedBall.posZ)
				Plotter.addPlot("DebugChip."..string..".verticalSpeedError", verticalSpeedError)
			end
		end
end

function DebugChip:_evaluate()

	if Ball.isShot() then
		self._wasShot = true
	end

	-- infinitesimal test
	if not self._lastBall and self._lastTimestamp then
		self._lastBall = World.Ball
		self._lastTimestamp = World.Time
	else
		local time = World.Time - self._lastTimestamp
		local string = "infinitesimal"
		self:_plotError(self._lastBall, time, string)
	end

	-- long term prediction
	if self._wasShot and #self._earlyBallTable == 5 then
		for i, entry in ipairs(self._earlyBallTable) do 
			local string = "longterm"..i..""
			local time = World.Time - entry.time
			self:_plotError(entry.ball, time, string)
		end 
	elseif #self._earlyBallTable < 5 then
		local index = #self._earlyBallTable + 1
		self._earlyBallTable[index] = {ball = World.Ball, time = World.Time}
	end
end

function DebugChip:_updateTasks()
	local taskAssignments = {}

	if World.Ball.pos.y > self._idlePos.y + distance + 1.5 then
		self:_resetChip()
	end

	taskAssignments[self._robots[1]] = { class = ChipTask, params = {self._idlePos, distance }, restart = self._restartFlag }
	self._restartFlag = false

	self:_evaluate()

	return taskAssignments
end

return DebugChip