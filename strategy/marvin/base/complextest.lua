local math = require("../../base/math")

local function random() 
	local a = math.random(2000000)-1000000
	local b = math.pow(10, math.random()*6)
	return a/b
end
--[[
local c0, c1, c2, c3, c4 = 0, 0, 0, 0, 0
for i = 1, 1000 do
	local x1, x2, x3, x4 = math.solveQrt(random(), random(), random(), random(), random())
	local cnt = 0
	if x1 and x1.im == 0 then
		cnt = cnt + 1
	end
	if x2 and x2.im == 0 then
		cnt = cnt + 1
	end
	if x3 and x3.im == 0 then
		cnt = cnt + 1
	end
	if x4 and x4.im == 0 then
		cnt = cnt + 1
	end
	if cnt == 0 then
		c0 = c0 + 1
	end
	if cnt == 1 then
		c1 = c1 + 1
	end
	if cnt == 2 then
		c2 = c2 + 1
	end
	if cnt == 3 then
		c3 = c3 + 1
	end
	if cnt == 4 then
		c4 = c4 + 1
	end
end

error("c0 "..c0..", c1 "..c1..", c2 "..c2..", c3 "..c3..", c4 "..c4)]]

local x1, x2, x3, x4 = math.solveQrt(1, 1, 1, 1, 4)
error(tostring(x1).."  "..tostring(x2).."  "..tostring(x3).."  "..tostring(x4))
