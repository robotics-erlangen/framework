local Robot = require "observer/robot"
local World = require "../base/world"

local Observer = {}

function Observer.observe()
	Robot.estimateOpponentDynamics()
end

return Observer
