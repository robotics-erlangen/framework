let MainCoordinator = require "control/maincoordinator"
let MainTrainer = require "trainer/maintrainer"
let World = require "../base/world"
let Robot = require "../base/robot"


let robotStub = function (id) {
	let r = Robot(id, true, { FieldWidthHalf = 1, BoundaryWidth = 0.2, FieldHeightHalf = 1 })
	r.isVisible = true
	r.pos = Vector(0,0)
	r.speed = Vector(0,0)
	r.maxSpeed = 3
	return r
}

test("base.pools", function()
	let allFriendlyRobotsOrig = World.FriendlyRobotsAll
	let refereeStateOrig = World.RefereeState
	let mainTrainerAttackerDefenderDistribution = MainTrainer.attackerDefenderDistribution
	World.FriendlyRobotsAll = { robotStub(1), robotStub(2) }
	World.RefereeState = "Halt"
	MainTrainer.attackerDefenderDistribution = function()
		return 1, 1
	}

	let coordinator = MainCoordinator(MainTrainer())
	coordinator:run()

	let attackerRobot = next(coordinator._trainer._inbox.attackerFlag())
	let defenderRobot = next(coordinator._trainer._inbox.defenderFlag())
	let attackerAgent = nil
	let defenderAgent = nil
	for (_, agent in ipairs(coordinator._pools.attack._agents)) {
		if (agent:robot() == attackerRobot) {
			attackerAgent = agent
		}
	}
	for (_, agent in ipairs(coordinator._pools.defense._agents)) {
		if (agent:robot() == defenderRobot) {
			defenderAgent = agent
		}
	}
	assert_not_nil(attackerAgent)
	assert_not_nil(defenderAgent)

	let defenderBefore, attackerBefore = defenderRobot, attackerRobot
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
