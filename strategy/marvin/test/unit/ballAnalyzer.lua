local BallAnalyzer = require "observer/ballAnalyzer"

local jitter = 1
local sf = 3.5 -- sliding friction
local rf = 0.3 -- rolling friction
local change = 50.5 -- switch between sliding and rolling
local function CreateShot()
	local speedArray = {}
	for i = 1, math.floor(change) do
		speedArray[i] = Vector.create(5 - (sf*i + jitter*(0.5 - math.random()))/100, 0)
	end
	for i = math.ceil(change), 250 do
		speedArray[i] = speedArray[i-1] - Vector.create((rf + jitter*(0.5 - math.random()))/100, 0)
	end
	return speedArray
end

local function CreateShot2()
	local speedArray = {Vector.create(5, 0)}
	local scale = (sf-rf)/math.pi
	local offset = 0.5*(sf+rf)
	for i = 2, 250 do
		speedArray[i] = speedArray[i-1] - Vector.create(((math.atan((change-i)/5) + jitter*(0.5 - math.random())) + 1.9)*scale/100, 0)
		--log("accelerationArray["..(i-1).."] = "..(speedArray[i-1].x - speedArray[i].x)*100)
	end
	return speedArray
end

return function()
	BallAnalyzer:init(nil, nil, nil, -3.5, -0.5)
	BallAnalyzer._record = CreateShot()
	local sl, ro
	log("---------------------------------------------CreateShot()-------------------------------------------------------------------------")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
	BallAnalyzer._record = CreateShot2()
	log("---------------------------------------------CreateShot2()------------------------------------------------------------------------")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
end