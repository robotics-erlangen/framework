let BallAnalyzer = Class("Observer.BallAnalyzer", require "+/base/process")

import * as debug from "base/debug";
import * as World from "base/world";
let MovingAverage = require "learning/movingaverage"
import * as Ball from "glados/observer/ball";


function BallAnalyzer:init (ball, movingAverageSlipping, movingAverageRolling, slippingFrictionStart, rollingFrictionStart) {
	this._ball = ball || World.Ball
	this._movingAverageSlipping = movingAverageSlipping || MovingAverage.get("SlippingFriction", 50000, -3.47)
	this._movingAverageRolling = movingAverageRolling || MovingAverage.get("RollingFriction", 50000, -0.305)
	this._slippingFriction = slippingFrictionStart || -3.47
	this._rollingFriction = rollingFrictionStart || -0.305
	this._recording = false
	this._record = {}
	this._times = {}
	this._stopTime = World.Time
}

function BallAnalyzer:update (slippingFriction, rollingFriction) {
	this._slippingFriction = slippingFriction
	this._rollingFriction = rollingFriction
}

let maxDiffSquared = 1
function BallAnalyzer:run () {
	let resultsSlipping, resultsRolling
	if (Ball.isShot()) {
		log("isShot")
		if (this._recording) {
			resultsSlipping, resultsRolling = this.analyze()
			this._record = {}
			this._times = {}
			log("shot again")
		} else {
			this._recording = true
		}
		this._stopTime = World.Time + 8 // stop one acquisition and start the next, when the ball is shot again before the 8 sec countdown
	}
	if (this._recording) {
		if (this._record[#this._record] && (this._ball.speed - this._record[#this._record]).lengthSq() > maxDiffSquared) {
			this._recording = false
			resultsSlipping, resultsRolling = this.analyze()
			this._record = {}
			this._times = {}
			log("deflected")
		} else {
			//log("add "+tostring(this._ball.speed))
			table.insert(this._record, this._ball.speed)
			table.insert(this._times, World.TimeDiff)
			if (World.Time > this._stopTime) {
				this._recording = false
				resultsSlipping, resultsRolling = this.analyze()
				this._record = {}
				this._times = {}
				log("time")
			}
		}
	}
	if (resultsSlipping) {
		log("Ergebnisse")
		for (_, v in ipairs(resultsSlipping)) {
			this._movingAverageSlipping:addValue(v)
		}
		for (_, v in ipairs(resultsRolling)) {
			this._movingAverageRolling:addValue(v)
		}
		BallAnalyzer:update(this._movingAverageSlipping:value(), this._movingAverageRolling:value())
		log("Slipping: "+this._movingAverageSlipping:value()+" | Rolling: "+this._movingAverageRolling:value())
	}
	debug.set("slipping friction", this._movingAverageSlipping:value())
	debug.set("rolling friction", this._movingAverageRolling:value())
}

let minRecord = 20
let fps = 100 // 100 frames per second
function BallAnalyzer:analyze () {
	// luacheck: ignore endSliding2 deviation2 slippingFriction2 rollingFriction2
	log("#this._record: "+#this._record)
	if (#this._record < minRecord) {
		return undefined, nil
	}
	let accelerationArray = {}
	let nEntries = 0
	for (i = 1, #this._record-1) {
		let nFrames = Math.round(this._times[i+1]*fps, 0)
		let accel = (this._record[i+1].length() - this._record[i].length())*fps/nFrames
		for (j = nEntries, nEntries+nFrames-1) {
			accelerationArray[j] = accel
		}
		nEntries = nEntries + nFrames
	}
	log("#accelerationArray: "+nEntries)
	//IO.save("ballAnalyzer/"+tostring(World.Time)+"_v.csv", this._record)
	//IO.save("ballAnalyzer/"+tostring(World.Time)+"_a.csv", accelerationArray)
	let overallFriction = Math.average(accelerationArray)
	let ratio = (this._rollingFriction - overallFriction)/(this._rollingFriction - this._slippingFriction)
	let startRolling = Math.ceil(MathUtil.bound(0.5, #accelerationArray*ratio, #accelerationArray))
	let endSliding = startRolling - 1
	let slippingFriction, rollingFriction = Math.average(accelerationArray, 1, endSliding), Math.average(accelerationArray, startRolling)
	let deviation = Math.variance(accelerationArray, slippingFriction, 1, endSliding) + Math.variance(accelerationArray, rollingFriction, startRolling)
	let startRolling2 = (startRolling > 1) ? startRolling - 1 : startRolling + 1
	let endSliding2 = startRolling2 - 1
	let slippingFriction2, rollingFriction2 = Math.average(accelerationArray, 1, endSliding2), Math.average(accelerationArray, startRolling2)
	let deviation2 = Math.variance(accelerationArray, slippingFriction2, 1, endSliding2) + Math.variance(accelerationArray, rollingFriction2, startRolling2)
	if (deviation2 < deviation) {
		deviation, deviation2 = deviation2, deviation // deviation is the better point
		startRolling, endSliding, startRolling2, endSliding2 = startRolling2, endSliding2, startRolling, endSliding
		slippingFriction, rollingFriction, slippingFriction2, rollingFriction2 = slippingFriction2, rollingFriction2, slippingFriction, rollingFriction
	}
	
//	for i = 2, #accelerationArray do
//		startRolling, endSliding = i, i-1
//		slippingFriction, rollingFriction = Math.average(accelerationArray, 1, endSliding), Math.average(accelerationArray, startRolling)
//		deviation = Math.variance(accelerationArray, slippingFriction, 1, endSliding) + Math.variance(accelerationArray, rollingFriction, startRolling)
//		log("startRolling: "+i+" | deviation: "+deviation)
//	end
//	//
	let running = true
	while (running) {
		log("startRolling: "+startRolling)
		log("deviation: "+deviation)
		log("sl: "+slippingFriction+" | ro: "+rollingFriction)
		if (startRolling > startRolling2) {
			startRolling2 = startRolling + 1
			running = not (startRolling2 > #accelerationArray) // out of boundaries
		} else {
			startRolling2 = startRolling - 1
			running = not (startRolling2 < 1) // out of boundaries
		}
		if (running) {
			endSliding2 = startRolling2 - 1
			slippingFriction2, rollingFriction2 = Math.average(accelerationArray, 1, endSliding2), Math.average(accelerationArray, startRolling2)
			deviation2 = Math.variance(accelerationArray, slippingFriction2, 1, endSliding2) + Math.variance(accelerationArray, rollingFriction2, startRolling2)
			if (deviation2 < deviation) {
				deviation = deviation2
				startRolling, endSliding, startRolling2, endSliding2 = startRolling2, endSliding2, startRolling, endSliding
				slippingFriction, rollingFriction, slippingFriction2, rollingFriction2 = slippingFriction2, rollingFriction2, slippingFriction, rollingFriction
			} else {
				running = false
			}
		}
	}
	log("startrolling danach: "+startRolling)
	
//	local deviation, limit = Infinity, #accelerationArray/10
//	local overallFriction = Math.average(accelerationArray)
//	local slippingFriction, rollingFriction = this._slippingFriction, this._rollingFriction
//	local startRolling, lastDeviation
//	local lastXdeviations = MovingAverage.get("dev", 25, Infinity) //andere Variablen aufräumen
//	lastXdeviations:addValue(Infinity) //hack
//	repeat
//		lastDeviation = deviation
//		local ratio = (rollingFriction - overallFriction)/(rollingFriction - slippingFriction)
//		log("ratio: "+ratio)
//		startRolling = MathUtil.bound(0.5, #accelerationArray*ratio, #accelerationArray)
//		log("length: "+#accelerationArray+" | start: "+Math.ceil(startRolling))
//		if (startRolling >= 1) {
//			slippingFriction = Math.average(accelerationArray, 1, Math.floor(startRolling))
//		end
//		if (startRolling <= #accelerationArray-1) {
//			rollingFriction = Math.average(accelerationArray, Math.ceil(startRolling))
//		end
//		log("sl: "+slippingFriction+" | ro: "+rollingFriction)
//		deviation = 0
//		for i = 1, Math.floor(startRolling) do
//			local diff = slippingFriction - accelerationArray[i]
//			deviation = deviation + diff*diff
//		end
//		for i = Math.ceil(startRolling), #accelerationArray do
//			local diff = rollingFriction - accelerationArray[i]
//			deviation = deviation + diff*diff
//		end
//		lastXdeviations:addValue(deviation)
//		log("Deviation: "+deviation)
//		// vorsicht, bei starkem rauschen kann deviation gar nicht beliebig klein werden, daher eher mit der ableitung von deviation nach der anzahl der iterationen arbeiten
//	until lastXdeviations:value() - deviation < 0.01
//	//
	let slFrSmoothed, roFrSmoothed
	if (startRolling <= #accelerationArray-3) {
		if (startRolling >= 3) {
			slippingFriction, rollingFriction = table.split(accelerationArray, Math.floor(startRolling))
			slFrSmoothed = BallAnalyzer.cutAndSmoothen(slippingFriction)
			roFrSmoothed = BallAnalyzer.cutAndSmoothen(rollingFriction)
		} else {
			let _
			_, rollingFriction = table.split(accelerationArray, Math.max(0, Math.floor(startRolling)))
			slFrSmoothed = {}
			roFrSmoothed = BallAnalyzer.cutAndSmoothen(rollingFriction)
		}
	} else {
		slippingFriction = table.split(accelerationArray, Math.min(Math.floor(startRolling), #accelerationArray))
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
				if (not table.remove(arraySmoothed, cutIndex) || diff[cutIndex+1] < avgDeviationHalf) {
					cutStart = false
				}
			}
			if (cutEnd) {
				if (not table.remove(arraySmoothed, #arraySmoothed-cutIndex+1) || diff[#arraySmoothed-cutIndex] < avgDeviationHalf) {
					cutEnd = false
				}
			}
			if (not (cutStart || cutEnd) || #arraySmoothed == 0) {
				break
			}
			avgSmoothed = Math.average(arraySmoothed)
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
