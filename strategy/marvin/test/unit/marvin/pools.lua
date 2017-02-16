local MainCoordinator = require "control/maincoordinator"
local MainTrainer = require "trainer/maintrainer"
local World = require "../base/world"
local Robot = require "../base/robot"


local function robotStub(id)
	local r = Robot(id, true, { FieldWidthHalf = 1, BoundaryWidth = 0.2, FieldHeightHalf = 1 })
	r.isVisible = true
	r.pos = Vector(0,0)
	r.speed = Vector(0,0)
	r.maxSpeed = 3
	return r
end

test("base.pools", function()
	local allFriendlyRobotsOrig = World.FriendlyRobotsAll
	local refereeStateOrig = World.RefereeState
	local mainTrainerAttackerDefenderDistribution = MainTrainer.attackerDefenderDistribution
	World.FriendlyRobotsAll = { robotStub(1), robotStub(2) }
	World.RefereeState = "Halt"
	MainTrainer.attackerDefenderDistribution = function()
		return 1, 1
	end

	local coordinator = MainCoordinator()
	coordinator:run()

	local attackerRobot = next(coordinator._trainer._inbox.attackerFlag())
	local defenderRobot = next(coordinator._trainer._inbox.defenderFlag())
	local attackerAgent = nil
	local defenderAgent = nil
	for _, agent in ipairs(coordinator._pools.attack._agents) do
		if agent:robot() == attackerRobot then
			attackerAgent = agent
		end
	end
	for _, agent in ipairs(coordinator._pools.defense._agents) do
		if agent:robot() == defenderRobot then
			defenderAgent = agent
		end
	end
	assert_not_nil(attackerAgent)
	assert_not_nil(defenderAgent)

	local defenderBefore, attackerBefore = defenderRobot, attackerRobot
	attackerAgent._send.poolChangeRequest("trainer", "defender")
	coordinator:run()

	attackerRobot = next(coordinator._trainer._inbox.attackerFlag())
	defenderRobot = next(coordinator._trainer._inbox.defenderFlag())
	assert_equal(attackerRobot, defenderBefore)
	assert_equal(defenderRobot, attackerBefore)

	defenderBefore, attackerBefore = defenderRobot, attackerRobot
	defenderAgent._send.poolChangeRequest("trainer", "attacker")
	coordinator:run()

	attackerRobot = next(coordinator._trainer._inbox.attackerFlag())
	defenderRobot = next(coordinator._trainer._inbox.defenderFlag())
	assert_equal(attackerRobot, defenderBefore)
	assert_equal(defenderRobot, attackerBefore)

	World.FriendlyRobotsAll = allFriendlyRobotsOrig
	World.RefereeState = refereeStateOrig
	MainTrainer.attackerDefenderDistribution = mainTrainerAttackerDefenderDistribution
end)
