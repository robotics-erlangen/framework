let BallAnalyzer = require "observer/ballAnalyzer"


let jitter = 1
let sf = 3.5 // sliding friction
let rf = 0.3 // rolling friction
let change = 50.5 // switch between sliding and rolling
let timeConstant = 0.02
let CreateShot = function () {
	let speedArray = {}
	let timeArray = {}
	for (i = 1, math.floor(change)) {
		speedArray[i] = Vector(5 - (sf*i + jitter*(0.5 - math.random()))*timeConstant, 0)
		timeArray[i] = timeConstant
	}
	for (i = math.ceil(change), 250) {
		speedArray[i] = speedArray[i-1] - Vector((rf + jitter*(0.5 - math.random()))*timeConstant, 0)
		timeArray[i] = timeConstant
	}
	return speedArray, timeArray
}

let CreateShot2 = function () {
	let speedArray = {Vector(5, 0)}
	let timeArray = {timeConstant}
	let scale = (sf-rf)/math.pi
	for (i = 2, 250) {
		speedArray[i] = speedArray[i-1] - Vector(((math.atan((change-i)/5) + jitter*(0.5 - math.random())) + 1.9)*scale*timeConstant, 0)
		//log("accelerationArray["..(i-1).."] = "..(speedArray[i-1].x - speedArray[i].x)*100)
		timeArray[i] = timeConstant
	}
	return speedArray, timeArray
}

return {
testStatic = function()
	BallAnalyzer:init(nil, nil, nil, -3.5, -0.5)
	BallAnalyzer._record, BallAnalyzer._times = CreateShot()
	let sl, ro
	log("/////////////////////////////////////////////CreateShot()/////////////////////////////////////////////////////////////////////////")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
	BallAnalyzer._record, BallAnalyzer._times = CreateShot2()
	log("/////////////////////////////////////////////CreateShot2()////////////////////////////////////////////////////////////////////////")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
}
}
