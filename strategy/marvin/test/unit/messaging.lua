local Messaging = require "control/messaging"
local Robot = require "../base/robot"

local function robotStub(id)
	return Robot(id, true, { FieldWidthHalf = 1, BoundaryWidth = 0.2, FieldHeightHalf = 1 })
end

local function agentStub(robotStub)
	local agent = {}
	agent.robot = function(self) return robotStub end
	return agent
end

test("Messaging", function()
	local dummyMsg = 2
	local agent1 = agentStub(robotStub(1))
	local agent1send, agent1inbox = Messaging.registerAgent(agent1)
	local agent2 = agentStub(robotStub(2))
	local agent2send, agent2inbox = Messaging.registerAgent(agent2)
	local agent3 = agentStub(robotStub(3))
	local agent3send, agent3inbox = Messaging.registerAgent(agent3)
	local trainerSend, trainerInbox = Messaging.registerTrainer()
	assert_error(Messaging.registerTrainer, "trainer may only registered once")

	assert_error(function() agent2send.foo(agent1:robot(), dummyMsg) end,
			"sending an invalid message shall fail")
	assert_not_error(function() agent3send.moveDestDir(agent2:robot(), dummyMsg) end,
			"sending a moveDestDir message shall be possible")
	assert_error(function() agent3send.moveDestDir(agent2:robot(), "bla") end,
			"messages shall be type-checked")

	agent1send.moveDest("all", Vector(0,0))
	Messaging.deliverMessages()
	assert_nil(agent1inbox.moveDest()[agent1:robot()],
			"broadcasts shall not be received by the sender")

	--agent1send(agent2:robot(), "moveDest", Vector(0,0))
	agent3send.moveDest("all", Vector(0,0))
	Messaging.deliverMessages()
	agent2 = agentStub(agent2:robot())
	agent2send, agent2inbox = Messaging.registerAgent(agent2)
	assert_nil(agent2inbox.moveDest()[agent1:robot()],
			"new agents shall get no messages which were sent to its robot when they had the old agent")
	assert_not_nil(agent2inbox.moveDest()[agent3:robot()],
			"new agents shall receive broadcasts")

	agent2send.exclusiveRole("trainer", {mainAttacker = 1})
	agent1send.exclusiveRole("trainer", {mainAttacker = 0.5})

	-- note that trainer can receive without calling deliverMessages() before
	local applications = trainerInbox.exclusiveRole()
	assert_equal(applications[agent2:robot()].mainAttacker, 1,
			"mainAttacker rating of robot 2 shall be 1")
	assert_equal(applications[agent1:robot()].mainAttacker, 0.5,
			"mainAttacker rating of robot 1 shall be 0.5")

	trainerSend.mainAttacker("all", agent2:robot())
	assert_equal(trainerInbox.mainAttacker().trainer, agent2:robot(),
			"Trainer shall receive its own broadcasts")
	Messaging.deliverMessages()
	assert_equal(agent1inbox.mainAttacker().trainer, agent2:robot(),
			"Robot 2 shall get the mainAttacker role")
end)
