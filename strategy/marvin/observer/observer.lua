local Robot = require "observer/robot"
local World = require "../base/world"
local Referee = require "util/referee"
local vis = require "../base/vis"
local Class = require "../base/class"
local TimedObserver = require "observer/timedobserver"

local Observer = {}

local timedObservers = {}

function Observer.observe()
	Robot.estimateOpponentDynamics()
	Robot._updateHadBall()
	Observer._illustrateRefereeStates()

	for i = #timedObservers,1,-1 do
		local observer = timedObservers[i]
		observer:run()
		if observer:isFinished() then
			table.remove(timedObservers, i)
		end
	end
end

function Observer.addTimedObserver(observer)
	assert(observer and Class.instanceOf(observer, TimedObserver), "no timed observer!")
	table.insert(timedObservers, observer)
end

function Observer._illustrateRefereeStates()
	if World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive" then
		vis.addPath("penaltyDistanceAllowed", {Vector.create(-2,World.Geometry.OwnPenaltyLine), Vector.create(2,World.Geometry.OwnPenaltyLine)}, vis.colors.red)
	elseif World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		vis.addPath("penaltyDistanceAllowed", {Vector.create(-2,World.Geometry.PenaltyLine), Vector.create(2,World.Geometry.PenaltyLine)}, vis.colors.red)
	elseif Referee.isStopState() then
		vis.addCircle("stopstateBallDist", World.Ball.pos, 0.5, vis.colors.redHalf, true)
	end
end

return Observer
