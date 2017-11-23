local DebugChip = Class("Test.Move.DebugChip", require "group/move/base")

local DebugCommands = require "../base/debugcommands"
local Plotter = require "../base/plot"
local World = require "../base/world"
local ChipTask = require "task/debugchip"
local Ball = require "observer/ball"
local Physics = require "observer/physics"

DebugChip.MIN_ROBOTS = 1
DebugChip.MAX_ROBOTS = 1

function DebugChip.canStart()
	return true
end

function DebugChip:_init()
	log("init")
	assert(amun.isDebug, "This move has to be run in debug mode!")
	self._angle = math.pi/2
	self._distance = 3
	self._timer = 10

	self._idlePos = Vector(1, -2)
	self._initBall = {
		pos = self._idlePos + (self._idlePos * -1):setLength(self._robots[1].radius + self._robots[1].shootRadius),
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
	self._timer = 50

	if not self._distance then
		self._distance = 1
	elseif self._distance > 4 then
		self._distance = 1
		if self._angle < math.pi then
			self._angle = self._angle + math.pi/8
		else
			self._angle = 0
		end
		self._idlePos = Vector(0, -2) + Vector.fromAngle(self._angle + math.pi)
		self._initBall.pos = self._idlePos + (self._idlePos * -1):setLength(self._robots[1].radius + self._robots[1].shootRadius)
	else
		self._distance = self._distance + 0.25
	end

	log("dist: "..tostring(self._distance))
	log("")
	

	local time = World.Time 
	self._testStart = time
	self._lastTimestamp = time
	self._wasShot = false
	self._lastBall = World.Ball
	self._earlyBallTable = {}
	DebugCommands.moveObjects(self._initBall)

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

	if self._timer > 0 then
		self._timer = self._timer - 1
	end

	local restartNecessary
	if World.Ball.pos:distanceTo(self._idlePos) > self._distance + 1.5 and self._timer == 0 then
		restartNecessary = true
		self:_resetChip()
	end

	taskAssignments[self._robots[1]] = { class = ChipTask, params = {self._idlePos, self._distance }, restart = restartNecessary }

	self:_evaluate()

	return taskAssignments
end

return DebugChip