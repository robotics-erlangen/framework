local BallAnalyzer = require "observer/ballAnalyzer"

local jitter = 2
return function()
	BallAnalyzer:init(nil, nil, nil, -2.75, -0.272)
	for i = 1, 50 do
		BallAnalyzer._record[i] = Vector.create(5 - (3.5*i + jitter*(0.5 - math.random()))/100, 0)
	end
	for i = 51, 250 do
		BallAnalyzer._record[i] = BallAnalyzer._record[i-1] - Vector.create((0.3 + jitter*(0.5 - math.random()))/100, 0)
	end
	local sl, ro
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
end