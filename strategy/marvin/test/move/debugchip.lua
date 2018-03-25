local DebugChip = Class("Test.Move.DebugChip", require "group/move/base")

local DebugCommands = require "../base/debugcommands"
local Plotter = require "../base/plot"
local World = require "../base/world"
local ChipTask = require "task/test/debugchip"
local PlaceBall = require "task/attacker/placeball"
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
	self._ballPlacement = false

	self._idlePos = Vector(1, -2)
	self._initBall = {
		pos = self._idlePos + (self._idlePos * -1):setLength(self._robots[1].radius + self._robots[1].shootRadius),
		posZ = 0,
		speed = Vector(0,0),
		speedZ = 0
	}

	local time = World.Time
	self._lastTimestamp = time
	self._wasShot = false
	self._lastBall = table.copy(World.Ball)
	self._midTermBallTable = {}
	self._oneSecondBallTable = {}
end

function DebugChip:_canContinue()
	return true
end

local function resetChip(self)
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
	self._lastTimestamp = time
	self._wasShot = false
	self._lastBall = table.copy(World.Ball)

	if World.IsSimulated then
		DebugCommands.moveObjects(self._initBall)
	end

end

local function plotError(string, horErr, horSpeedErr, vertErr, vertSpeedErr)
	Plotter.addPlot("DebugChip."..string..".horizontalError", horErr)
	Plotter.addPlot("DebugChip."..string..".horizontalSpeedError", horSpeedErr)
	Plotter.addPlot("DebugChip."..string..".verticalError", vertErr)
	Plotter.addPlot("DebugChip."..string..".verticalSpeedError", vertSpeedErr)
end

local function plotErrorTwoBalls(ballOld, time, string)
	local horizontalError, horizontalSpeedError
	local verticalError, verticalSpeedError = 0, 0

	local ballNew = World.Ball
	local predictedBall = Physics.ballAtTimeExperimental(ballOld, time)

	horizontalError = ballNew.pos:distanceTo(predictedBall.pos)
	horizontalSpeedError = math.abs(ballNew.speed:length() - predictedBall.speed:length())

	if predictedBall.posZ then
		verticalError = math.abs(ballNew.posZ - predictedBall.posZ)
		verticalSpeedError = math.abs(ballNew.posZ, predictedBall.posZ)
	end

	plotError(string, horizontalError, horizontalSpeedError, verticalError, verticalSpeedError)
end

local function compareBalls(predictedBall, actualBall)
	local horErr = math.abs(predictedBall.pos:distanceTo(actualBall.pos))
	local horSpeedErr = math.abs(predictedBall.speed:length() - predictedBall.speed:length())
	local vertErr, vertSpeedErr = 0, 0
	if predictedBall.posZ then
		vertErr = math.abs(predictedBall.posZ - predictedBall.posZ)
		vertSpeedErr = math.abs(predictedBall.posZ, predictedBall.posZ)
	end
	return {horErr = horErr, horSpeedErr = horSpeedErr, vertErr = vertErr, vertSpeedErr = vertSpeedErr}
end

local function printTable(balls)
	log("table:")
	if balls[1] then
	log(tostring(balls[1].ball).." | "..tostring(balls[1].time))
	end-- for _, entry in ipairs(balls) do
	-- 	log(tostring(entry.ball).." | "..tostring(entry.time))
	-- end
	log("")
end

local function evaluate(self)

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
		plotErrorTwoBalls(self._lastBall, time, string)
	end

	-- mid term prediction
	if #self._midTermBallTable == 10 then
		local sumHorErr, sumHorSpeedErr, sumVertErr, sumVertSpeedErr = 0, 0, 0, 0
		for id, entry in ipairs(self._midTermBallTable) do
			if id ~= 1 then
				local predictedBall = Physics.ballAtTimeExperimental(entry.ball, World.Time - entry.time)
				local errTable = compareBalls(predictedBall, entry.ball)
				sumHorErr = sumHorErr + errTable.horErr
				sumHorSpeedErr = sumHorSpeedErr + errTable.horSpeedErr
				sumVertErr = sumVertErr + errTable.vertErr
				sumVertSpeedErr = sumVertSpeedErr + errTable.vertSpeedErr
			end
		end
		local avgHorErr = sumHorErr / 9
		local avgHorSpeedErr = sumHorSpeedErr / 9
		local avgVertErr = sumVertErr / 9
		local avgVertSpeedErr = sumVertSpeedErr/ 9
		plotError("midTerm", avgHorErr, avgHorSpeedErr, avgVertErr, avgVertSpeedErr)
		table.remove(self._midTermBallTable, 1)
		table.insert(self._midTermBallTable, {ball = table.copy(World.Ball), time = World.Time})
	else
		table.insert(self._midTermBallTable, {ball = table.copy(World.Ball), time = World.Time})
	end

	-- half second prediction
	local halfSecTable = self._oneSecondBallTable
	printTable(self._oneSecondBallTable)
	-- if halfSecTable[1] then
	-- 	--log(World.Time - halfSecTable[1].time.." ||| "..tostring(#halfSecTable)
	-- end
	if #halfSecTable == 5 and World.Time - halfSecTable[1].time > 0.5 then
		--log("hallo")
		local ball = halfSecTable[1].ball
		local time = World.Time - halfSecTable[1].time
		local errTable = compareBalls(Physics.ballAtTimeExperimental(ball, time), World.Ball)
		plotError("half second", errTable.horErr, errTable.speedErr, errTable.vertErr, errTable.vertSpeedErr)
		table.remove(self._oneSecondBallTable, 1)
		table.insert(self._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	elseif #halfSecTable < 5 and halfSecTable[1] and World.Time - halfSecTable[#halfSecTable].time > 0.2 then
		table.insert(self._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	elseif not halfSecTable[1] then
		table.insert(self._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	end

end

function DebugChip:_updateTasks()
	local taskAssignments = {}

	if self._timer > 0 then
		self._timer = self._timer - 1
	end

	local restartNecessary
	if World.Ball.pos:distanceTo(self._idlePos) > self._distance + 1.5
				and self._timer == 0 and self._ballPlacement == false then
		restartNecessary = true
		if World.IsSimulated == false then
			self._ballPlacement = true
		end
		resetChip(self)
	end

	if not self._ballPlacement then
		taskAssignments[self._robots[1]] = { class = ChipTask, params = {self._idlePos, self._distance }, restart = restartNecessary }
	else
		taskAssignments[self._robots[1]] = { class = PlaceBall, params = {self._initBall.pos}, restart = restartNecessary }
	end

	if World.Ball.pos:distanceTo(self._initBall.pos) < 0.3 then
		self._ballPlacement = false
	end

	evaluate(self)

	return taskAssignments
end

return DebugChip
