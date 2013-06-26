local Robot = require "observer/robot"
local World = require "../base/world"
local Referee = require "util/referee"
local vis = require "../base/vis"
local MixedTeam = require "observer/mixedteam"

local Observer = {}

function Observer.observe()
	Robot.estimateOpponentDynamics()
	Robot._updateHadBall()
	Observer._illustrateRefereeStates()
	if Settings.partnerRobots then
		MixedTeam.noPartnerTouched() -- sets global 'noPartnerTouched'
	end
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
