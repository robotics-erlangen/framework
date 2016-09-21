local BallAnalyzer = Class("Observer.BallAnalyzer", require "../base/process")

local debug = require "../base/debug"
local World = require "../base/world"
local MovingAverage = require "learning/movingaverage"
local Ball = require "observer/ball"
local IO = require "util/io"


function BallAnalyzer:init(ball, movingAverageSlipping, movingAverageRolling, slippingFrictionStart, rollingFrictionStart)
	self._ball = ball or World.Ball
	self._movingAverageSlipping = movingAverageSlipping or MovingAverage.get("SlippingFriction", 50000, -3.47)
	self._movingAverageRolling = movingAverageRolling or MovingAverage.get("RollingFriction", 50000, -0.305)
	self._slippingFriction = slippingFrictionStart or -3.47
	self._rollingFriction = rollingFrictionStart or -0.305
	self._recording = false
	self._record = {}
	self._times = {}
	self._stopTime = World.Time
end

function BallAnalyzer:update(slippingFriction, rollingFriction)
	self._slippingFriction = slippingFriction
	self._rollingFriction = rollingFriction
end

local maxDiffSquared = 1
function BallAnalyzer:run()
	local resultsSlipping, resultsRolling
	if Ball.isShot() then
		log("isShot")
		if self._recording then
			resultsSlipping, resultsRolling = self:analyze()
			self._record = {}
			self._times = {}
			log("shot again")
		else
			self._recording = true
		end
		self._stopTime = World.Time + 8 -- stop one acquisition and start the next, when the ball is shot again before the 8 sec countdown
	end
	if self._recording then
		if self._record[#self._record] and (self._ball.speed - self._record[#self._record]):lengthSq() > maxDiffSquared then
			self._recording = false
			resultsSlipping, resultsRolling = self:analyze()
			self._record = {}
			self._times = {}
			log("deflected")
		else
			--log("add "..tostring(self._ball.speed))
			table.insert(self._record, self._ball.speed)
			table.insert(self._times, World.TimeDiff)
			if World.Time > self._stopTime then
				self._recording = false
				resultsSlipping, resultsRolling = self:analyze()
				self._record = {}
				self._times = {}
				log("time")
			end
		end
	end
	if resultsSlipping then
		log("Ergebnisse")
		for _, v in ipairs(resultsSlipping) do
			self._movingAverageSlipping:addValue(v)
		end
		for _, v in ipairs(resultsRolling) do
			self._movingAverageRolling:addValue(v)
		end
		BallAnalyzer:update(self._movingAverageSlipping:value(), self._movingAverageRolling:value())
		log("Slipping: "..self._movingAverageSlipping:value().." | Rolling: "..self._movingAverageRolling:value())
	end
	debug.set("slipping friction", self._movingAverageSlipping:value())
	debug.set("rolling friction", self._movingAverageRolling:value())
end

local minRecord = 20
local fps = 100 -- 100 frames per second
function BallAnalyzer:analyze()
	log("#self._record: "..#self._record)
	if #self._record < minRecord then
		return nil, nil
	end
	local accelerationArray = {}
	local nEntries = 0
	for i = 1, #self._record-1 do
		local nFrames = math.round(self._times[i+1]*fps, 0)
		local accel = (self._record[i+1]:length() - self._record[i]:length())*fps/nFrames
		for j = nEntries, nEntries+nFrames-1 do
			accelerationArray[j] = accel
		end
		nEntries = nEntries + nFrames
	end
	log("#accelerationArray: "..nEntries)
	--IO.save("ballAnalyzer/"..tostring(World.Time).."_v.csv", self._record)
	--IO.save("ballAnalyzer/"..tostring(World.Time).."_a.csv", accelerationArray)
	local overallFriction = math.average(accelerationArray)
	local ratio = (self._rollingFriction - overallFriction)/(self._rollingFriction - self._slippingFriction)
	local startRolling = math.ceil(math.bound(0.5, #accelerationArray*ratio, #accelerationArray))
	local endSliding = startRolling - 1
	local slippingFriction, rollingFriction = math.average(accelerationArray, 1, endSliding), math.average(accelerationArray, startRolling)
	local deviation = math.variance(accelerationArray, slippingFriction, 1, endSliding) + math.variance(accelerationArray, rollingFriction, startRolling)
	local startRolling2 = (startRolling > 1) and startRolling - 1 or startRolling + 1
	local endSliding2 = startRolling2 - 1
	local slippingFriction2, rollingFriction2 = math.average(accelerationArray, 1, endSliding2), math.average(accelerationArray, startRolling2)
	local deviation2 = math.variance(accelerationArray, slippingFriction2, 1, endSliding2) + math.variance(accelerationArray, rollingFriction2, startRolling2)
	if deviation2 < deviation then
		deviation, deviation2 = deviation2, deviation -- deviation is the better point
		startRolling, endSliding, startRolling2, endSliding2 = startRolling2, endSliding2, startRolling, endSliding
		slippingFriction, rollingFriction, slippingFriction2, rollingFriction2 = slippingFriction2, rollingFriction2, slippingFriction, rollingFriction
	end
	--[[
	for i = 2, #accelerationArray do
		startRolling, endSliding = i, i-1
		slippingFriction, rollingFriction = math.average(accelerationArray, 1, endSliding), math.average(accelerationArray, startRolling)
		deviation = math.variance(accelerationArray, slippingFriction, 1, endSliding) + math.variance(accelerationArray, rollingFriction, startRolling)
		log("startRolling: "..i.." | deviation: "..deviation)
	end
	]]--
	local running = true
	while running do
		log("startRolling: "..startRolling)
		log("deviation: "..deviation)
		log("sl: "..slippingFriction.." | ro: "..rollingFriction)
		if startRolling > startRolling2 then
			startRolling2 = startRolling + 1
			running = not (startRolling2 > #accelerationArray) -- out of boundaries
		else
			startRolling2 = startRolling - 1
			running = not (startRolling2 < 1) -- out of boundaries
		end
		if running then
			endSliding2 = startRolling2 - 1
			slippingFriction2, rollingFriction2 = math.average(accelerationArray, 1, endSliding2), math.average(accelerationArray, startRolling2)
			deviation2 = math.variance(accelerationArray, slippingFriction2, 1, endSliding2) + math.variance(accelerationArray, rollingFriction2, startRolling2)
			if deviation2 < deviation then
				deviation = deviation2
				startRolling, endSliding, startRolling2, endSliding2 = startRolling2, endSliding2, startRolling, endSliding
				slippingFriction, rollingFriction, slippingFriction2, rollingFriction2 = slippingFriction2, rollingFriction2, slippingFriction, rollingFriction
			else
				running = false
			end
		end
	end
	log("startrolling danach: "..startRolling)
	--[[
	local deviation, limit = math.huge, #accelerationArray/10
	local overallFriction = math.average(accelerationArray)
	local slippingFriction, rollingFriction = self._slippingFriction, self._rollingFriction
	local startRolling, lastDeviation
	local lastXdeviations = MovingAverage.get("dev", 25, math.huge) --andere Variablen aufräumen
	lastXdeviations:addValue(math.huge) --hack
	repeat
		lastDeviation = deviation
		local ratio = (rollingFriction - overallFriction)/(rollingFriction - slippingFriction)
		log("ratio: "..ratio)
		startRolling = math.bound(0.5, #accelerationArray*ratio, #accelerationArray)
		log("length: "..#accelerationArray.." | start: "..math.ceil(startRolling))
		if startRolling >= 1 then
			slippingFriction = math.average(accelerationArray, 1, math.floor(startRolling))
		end
		if startRolling <= #accelerationArray-1 then
			rollingFriction = math.average(accelerationArray, math.ceil(startRolling))
		end
		log("sl: "..slippingFriction.." | ro: "..rollingFriction)
		deviation = 0
		for i = 1, math.floor(startRolling) do
			local diff = slippingFriction - accelerationArray[i]
			deviation = deviation + diff*diff
		end
		for i = math.ceil(startRolling), #accelerationArray do
			local diff = rollingFriction - accelerationArray[i]
			deviation = deviation + diff*diff
		end
		lastXdeviations:addValue(deviation)
		log("Deviation: "..deviation)
		-- vorsicht, bei starkem rauschen kann deviation gar nicht beliebig klein werden, daher eher mit der ableitung von deviation nach der anzahl der iterationen arbeiten
	until lastXdeviations:value() - deviation < 0.01
	]]--
	local slFrSmoothed, roFrSmoothed
	if startRolling <= #accelerationArray-3 then
		if startRolling >= 3 then
			slippingFriction, rollingFriction = table.split(accelerationArray, math.floor(startRolling))
			slFrSmoothed = BallAnalyzer.cutAndSmoothen(slippingFriction)
			roFrSmoothed = BallAnalyzer.cutAndSmoothen(rollingFriction)
		else
			local _
			_, rollingFriction = table.split(accelerationArray, math.max(0, math.floor(startRolling)))
			slFrSmoothed = {}
			roFrSmoothed = BallAnalyzer.cutAndSmoothen(rollingFriction)
		end
	else
		slippingFriction = table.split(accelerationArray, math.min(math.floor(startRolling), #accelerationArray))
		slFrSmoothed = BallAnalyzer.cutAndSmoothen(slippingFriction)
		roFrSmoothed = {}
	end
	return slFrSmoothed, roFrSmoothed
end

function BallAnalyzer.cutAndSmoothen(array)
	local sum = 0
	local arraySmoothed = {}
	for i = #array-2, 1, -1 do
		arraySmoothed[i] = 0.25*(array[i] + 2*array[i+1] + array[i+2])
		sum = sum + arraySmoothed[i]
	end
	local avgSmoothed, maxDeviation, diff = sum/#arraySmoothed, 0, {}
	for k, v in ipairs(arraySmoothed) do
		diff[k] = avgSmoothed - v
		diff[k] = diff[k]*diff[k]
		maxDeviation = maxDeviation + diff[k]
	end
	local deviation = maxDeviation
	local avgDeviationHalf, closeEnough, cutStart, cutEnd, cutIndex = maxDeviation/(2*#diff), false, true, true, 1
	repeat
		--log("d")
		if deviation < 0.5*maxDeviation then
			closeEnough = true
		else
			if cutStart then
				if not table.remove(arraySmoothed, cutIndex) or diff[cutIndex+1] < avgDeviationHalf then
					cutStart = false
				end
			end
			if cutEnd then
				if not table.remove(arraySmoothed, #arraySmoothed-cutIndex+1) or diff[#arraySmoothed-cutIndex] < avgDeviationHalf then
					cutEnd = false
				end
			end
			if not (cutStart or cutEnd) or #arraySmoothed == 0 then
				break
			end
			avgSmoothed = math.average(arraySmoothed)
			deviation = 0
			for k, v in ipairs(arraySmoothed) do
				diff[k] = avgSmoothed - v
				diff[k] = diff[k]*diff[k]
				deviation = deviation + diff[k]
			end
		end
		cutIndex = cutIndex + 1
	until closeEnough
	return arraySmoothed
end

function BallAnalyzer:isFinished()
	return false
end

return BallAnalyzer
