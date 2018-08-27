let BallAnalyzer = require "observer/ballAnalyzer"

import * as MathUtil from "base/mathutil";


let jitter = 1
let sf = 3.5 // sliding friction
let rf = 0.3 // rolling friction
let change = 50.5 // switch between sliding and rolling
let timeConstant = 0.02
let CreateShot = function () {
	let speedArray = {}
	let timeArray = {}
	for (i = 1, Math.floor(change)) {
		speedArray[i] = new Vector(5 - (sf*i + jitter*(0.5 - MathUtil.random()))*timeConstant, 0)
		timeArray[i] = timeConstant
	}
	for (i = Math.ceil(change), 250) {
		speedArray[i] = speedArray[i-1] - new Vector((rf + jitter*(0.5 - MathUtil.random()))*timeConstant, 0)
		timeArray[i] = timeConstant
	}
	return speedArray, timeArray
}

let CreateShot2 = function () {
	let speedArray = {new Vector(5, 0)}
	let timeArray = {timeConstant}
	let scale = (sf-rf)/Math.PI
	for (i = 2, 250) {
		speedArray[i] = speedArray[i-1] - new Vector(((Math.atan((change-i)/5) + jitter*(0.5 - MathUtil.random())) + 1.9)*scale*timeConstant, 0)
		//log("accelerationArray["+(i-1)+"] = "+(speedArray[i-1].x - speedArray[i].x)*100)
		timeArray[i] = timeConstant
	}
	return speedArray, timeArray
}

return {
testStatic = function()
	BallAnalyzer:init(nil, undefined, undefined, -3.5, -0.5)
	BallAnalyzer._record, BallAnalyzer._times = CreateShot()
	let sl, ro
	log("/////////////////////////////////////////////CreateShot()/////////////////////////////////////////////////////////////////////////")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "+Math.average(sl)+" | Rolling friction: "+Math.average(ro))
	BallAnalyzer._record, BallAnalyzer._times = CreateShot2()
	log("/////////////////////////////////////////////CreateShot2()////////////////////////////////////////////////////////////////////////")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "+Math.average(sl)+" | Rolling friction: "+Math.average(ro))
}
}
