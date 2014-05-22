local BallAnalyzer = require "observer/ballAnalyzer"

local jitter = 1
local function CreateShot()
	local speedArray = {}
	for i = 1, 50 do
		speedArray[i] = Vector.create(5 - (3.5*i + jitter*(0.5 - math.random()))/100, 0)
	end
	for i = 51, 250 do
		speedArray[i] = speedArray[i-1] - Vector.create((0.3 + jitter*(0.5 - math.random()))/100, 0)
	end
	return speedArray
end

local function CreateShot2()
	local speedArray = {Vector.create(5, 0)}
	for i = 2, 250 do
		speedArray[i] = speedArray[i-1] - Vector.create(((math.atan((50-i)/5) + jitter*(0.5 - math.random())) + 1.9)/100, 0)
		--log("accelerationArray["..(i-1).."] = "..(speedArray[i-1].x - speedArray[i].x)*100)
	end
	return speedArray
end

return function()
	BallAnalyzer:init(nil, nil, nil, -2.25, -0,5)
	BallAnalyzer._record = CreateShot()
	local sl, ro
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
	BallAnalyzer._record = CreateShot2()
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
end