let BallAnalyzer = Class("Observer.BallAnalyzer", require "../base/process")

let debug = require "../base/debug"
let World = require "../base/world"
let MovingAverage = require "learning/movingaverage"
let Ball = require "observer/ball"


function BallAnalyzer:init (ball, movingAverageSlipping, movingAverageRolling, slippingFrictionStart, rollingFrictionStart) {
	self._ball = ball  ||  World.Ball
	self._movingAverageSlipping = movingAverageSlipping  ||  MovingAverage.get("SlippingFriction", 50000, -3.47)
	self._movingAverageRolling = movingAverageRolling  ||  MovingAverage.get("RollingFriction", 50000, -0.305)
	self._slippingFriction = slippingFrictionStart  ||  -3.47
	self._rollingFriction = rollingFrictionStart  ||  -0.305
	self._recording = false
	self._record = {}
	self._times = {}
	self._stopTime = World.Time
}

function BallAnalyzer:update (slippingFriction, rollingFriction) {
	self._slippingFriction = slippingFriction
	self._rollingFriction = rollingFriction
}

let maxDiffSquared = 1
function BallAnalyzer:run () {
	let resultsSlipping, resultsRolling
	if (Ball.isShot()) {
		log("isShot")
		if (self._recording) {
			resultsSlipping, resultsRolling = self:analyze()
			self._record = {}
			self._times = {}
			log("shot again")
		} else {
			self._recording = true
		}
		self._stopTime = World.Time + 8 // stop one acquisition and start the next, when the ball is shot again before the 8 sec countdown
	}
	if (self._recording) {
		if (self._record[#self._record]  &&  (self._ball.speed - self._record[#self._record]):lengthSq() > maxDiffSquared) {
			self._recording = false
			resultsSlipping, resultsRolling = self:analyze()
			self._record = {}
			self._times = {}
			log("deflected")
		} else {
			//log("add "..tostring(self._ball.speed))
			table.insert(self._record, self._ball.speed)
			table.insert(self._times, World.TimeDiff)
			if (World.Time > self._stopTime) {
				self._recording = false
				resultsSlipping, resultsRolling = self:analyze()
				self._record = {}
				self._times = {}
				log("time")
			}
		}
	}
	if (resultsSlipping) {
		log("Ergebnisse")
		for (_, v in ipairs(resultsSlipping)) {
			self._movingAverageSlipping:addValue(v)
		}
		for (_, v in ipairs(resultsRolling)) {
			self._movingAverageRolling:addValue(v)
		}
		BallAnalyzer:update(self._movingAverageSlipping:value(), self._movingAverageRolling:value())
		log("Slipping: "..self._movingAverageSlipping:value().." | Rolling: "..self._movingAverageRolling:value())
	}
	debug.set("slipping friction", self._movingAverageSlipping:value())
	debug.set("rolling friction", self._movingAverageRolling:value())
}

let minRecord = 20
let fps = 100 // 100 frames per second
function BallAnalyzer:analyze () {
	// luacheck: ignore endSliding2 deviation2 slippingFriction2 rollingFriction2
	log("#self._record: "..#self._record)
	if (#self._record < minRecord) {
		return nil, nil
	}
	let accelerationArray = {}
	let nEntries = 0
	for (i = 1, #self._record-1) {
		let nFrames = math.round(self._times[i+1]*fps, 0)
		let accel = (self._record[i+1]:length() - self._record[i]:length())*fps/nFrames
		for (j = nEntries, nEntries+nFrames-1) {
			accelerationArray[j] = accel
		}
		nEntries = nEntries + nFrames
	}
	log("#accelerationArray: "..nEntries)
	//IO.save("ballAnalyzer/"..tostring(World.Time).."_v.csv", self._record)
	//IO.save("ballAnalyzer/"..tostring(World.Time).."_a.csv", accelerationArray)
	let overallFriction = math.average(accelerationArray)
	let ratio = (self._rollingFriction - overallFriction)/(self._rollingFriction - self._slippingFriction)
	let startRolling = math.ceil(math.bound(0.5, #accelerationArray*ratio, #accelerationArray))
	let endSliding = startRolling - 1
	let slippingFriction, rollingFriction = math.average(accelerationArray, 1, endSliding), math.average(accelerationArray, startRolling)
	let deviation = math.variance(accelerationArray, slippingFriction, 1, endSliding) + math.variance(accelerationArray, rollingFriction, startRolling)
	let startRolling2 = (startRolling > 1) ? startRolling - 1 : startRolling + 1
	let endSliding2 = startRolling2 - 1
	let slippingFriction2, rollingFriction2 = math.average(accelerationArray, 1, endSliding2), math.average(accelerationArray, startRolling2)
	let deviation2 = math.variance(accelerationArray, slippingFriction2, 1, endSliding2) + math.variance(accelerationArray, rollingFriction2, startRolling2)
	if (deviation2 < deviation) {
		deviation, deviation2 = deviation2, deviation // deviation is the better point
		startRolling, endSliding, startRolling2, endSliding2 = startRolling2, endSliding2, startRolling, endSliding
		slippingFriction, rollingFriction, slippingFriction2, rollingFriction2 = slippingFriction2, rollingFriction2, slippingFriction, rollingFriction
	}
	
//	for i = 2, #accelerationArray do
//		startRolling, endSliding = i, i-1
//		slippingFriction, rollingFriction = math.average(accelerationArray, 1, endSliding), math.average(accelerationArray, startRolling)
//		deviation = math.variance(accelerationArray, slippingFriction, 1, endSliding) + math.variance(accelerationArray, rollingFriction, startRolling)
//		log("startRolling: "..i.." | deviation: "..deviation)
//	end
//	//
	let running = true
	while (running) {
		log("startRolling: "..startRolling)
		log("deviation: "..deviation)
		log("sl: "..slippingFriction.." | ro: "..rollingFriction)
		if (startRolling > startRolling2) {
			startRolling2 = startRolling + 1
			running = not (startRolling2 > #accelerationArray) // out of boundaries
		} else {
			startRolling2 = startRolling - 1
			running = not (startRolling2 < 1) // out of boundaries
		}
		if (running) {
			endSliding2 = startRolling2 - 1
			slippingFriction2, rollingFriction2 = math.average(accelerationArray, 1, endSliding2), math.average(accelerationArray, startRolling2)
			deviation2 = math.variance(accelerationArray, slippingFriction2, 1, endSliding2) + math.variance(accelerationArray, rollingFriction2, startRolling2)
			if (deviation2 < deviation) {
				deviation = deviation2
				startRolling, endSliding, startRolling2, endSliding2 = startRolling2, endSliding2, startRolling, endSliding
				slippingFriction, rollingFriction, slippingFriction2, rollingFriction2 = slippingFriction2, rollingFriction2, slippingFriction, rollingFriction
			} else {
				running = false
			}
		}
	}
	log("startrolling danach: "..startRolling)
	
//	local deviation, limit = math.huge, #accelerationArray/10
//	local overallFriction = math.average(accelerationArray)
//	local slippingFriction, rollingFriction = self._slippingFriction, self._rollingFriction
//	local startRolling, lastDeviation
//	local lastXdeviations = MovingAverage.get("dev", 25, math.huge) //andere Variablen aufräumen
//	lastXdeviations:addValue(math.huge) //hack
//	repeat
//		lastDeviation = deviation
//		local ratio = (rollingFriction - overallFriction)/(rollingFriction - slippingFriction)
//		log("ratio: "..ratio)
//		startRolling = math.bound(0.5, #accelerationArray*ratio, #accelerationArray)
//		log("length: "..#accelerationArray.." | start: "..math.ceil(startRolling))
//		if (startRolling >= 1) {
//			slippingFriction = math.average(accelerationArray, 1, math.floor(startRolling))
//		end
//		if (startRolling <= #accelerationArray-1) {
//			rollingFriction = math.average(accelerationArray, math.ceil(startRolling))
//		end
//		log("sl: "..slippingFriction.." | ro: "..rollingFriction)
//		deviation = 0
//		for i = 1, math.floor(startRolling) do
//			local diff = slippingFriction - accelerationArray[i]
//			deviation = deviation + diff*diff
//		end
//		for i = math.ceil(startRolling), #accelerationArray do
//			local diff = rollingFriction - accelerationArray[i]
//			deviation = deviation + diff*diff
//		end
//		lastXdeviations:addValue(deviation)
//		log("Deviation: "..deviation)
//		// vorsicht, bei starkem rauschen kann deviation gar nicht beliebig klein werden, daher eher mit der ableitung von deviation nach der anzahl der iterationen arbeiten
//	until lastXdeviations:value() - deviation < 0.01
//	//
	let slFrSmoothed, roFrSmoothed
	if (startRolling <= #accelerationArray-3) {
		if (startRolling >= 3) {
			slippingFriction, rollingFriction = table.split(accelerationArray, math.floor(startRolling))
			slFrSmoothed = BallAnalyzer.cutAndSmoothen(slippingFriction)
			roFrSmoothed = BallAnalyzer.cutAndSmoothen(rollingFriction)
		} else {
			let _
			_, rollingFriction = table.split(accelerationArray, math.max(0, math.floor(startRolling)))
			slFrSmoothed = {}
			roFrSmoothed = BallAnalyzer.cutAndSmoothen(rollingFriction)
		}
	} else {
		slippingFriction = table.split(accelerationArray, math.min(math.floor(startRolling), #accelerationArray))
		slFrSmoothed = BallAnalyzer.cutAndSmoothen(slippingFriction)
		roFrSmoothed = {}
	}
	return slFrSmoothed, roFrSmoothed
}

function BallAnalyzer.cutAndSmoothen (array) {
	let sum = 0
	let arraySmoothed = {}
	for (i = #array-2, 1, -1) {
		arraySmoothed[i] = 0.25*(array[i] + 2*array[i+1] + array[i+2])
		sum = sum + arraySmoothed[i]
	}
	let avgSmoothed, maxDeviation, diff = sum/#arraySmoothed, 0, {}
	for (k, v in ipairs(arraySmoothed)) {
		diff[k] = avgSmoothed - v
		diff[k] = diff[k]*diff[k]
		maxDeviation = maxDeviation + diff[k]
	}
	let deviation = maxDeviation
	let avgDeviationHalf, closeEnough, cutStart, cutEnd, cutIndex = maxDeviation/(2*#diff), false, true, true, 1
	repeat
		//log("d")
		if (deviation < 0.5*maxDeviation) {
			closeEnough = true
		} else {
			if (cutStart) {
				if (not table.remove(arraySmoothed, cutIndex)  ||  diff[cutIndex+1] < avgDeviationHalf) {
					cutStart = false
				}
			}
			if (cutEnd) {
				if (not table.remove(arraySmoothed, #arraySmoothed-cutIndex+1)  ||  diff[#arraySmoothed-cutIndex] < avgDeviationHalf) {
					cutEnd = false
				}
			}
			if (not (cutStart  ||  cutEnd)  ||  #arraySmoothed == 0) {
				break
			}
			avgSmoothed = math.average(arraySmoothed)
			deviation = 0
			for (k, v in ipairs(arraySmoothed)) {
				diff[k] = avgSmoothed - v
				diff[k] = diff[k]*diff[k]
				deviation = deviation + diff[k]
			}
		}
		cutIndex = cutIndex + 1
	until closeEnough
	return arraySmoothed
}

function BallAnalyzer:isFinished () {
	return false
}

return BallAnalyzer
