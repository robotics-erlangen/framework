local Robot = require "observer/robot"
local World = require "../base/world"
local Referee = require "util/referee"
local vis = require "../base/vis"
local Class = require "../base/class"
local Analyzer = require "observer/analyzer"

local Observer = {}

local analyzers = {}

function Observer.observe()
	Robot.estimateOpponentDynamics()
	Robot._updateHadBall()
	Observer._illustrateRefereeStates()
end

function Observer.analyze()
	for i = #analyzers,1,-1 do
		local analyzer = analyzers[i]
		analyzer:run()
		if analyzer:isFinished() then
			table.remove(analyzers, i)
		end
	end
end

function Observer.addAnalyzer(analyzer)
	assert(analyzer and Class.instanceOf(analyzer, Analyzer), "no analyzer!")
	table.insert(analyzers, analyzer)
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
