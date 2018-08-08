local Messaging = require "control/messaging"
local Robot = require "../base/robot"

local function robotStub(id)
	return Robot(id, true, { FieldWidthHalf = 1, BoundaryWidth = 0.2, FieldHeightHalf = 1 })
end

local function agentStub(robotStub)
	local agent = {}
	agent.robot = function() return robotStub end
	return agent
end

local function fold(tables)
	return table.reduce(tables, table.extend, {})
end

test("Messaging", function()
	local messaging = Messaging()
	local dummyMsg = 2
	local agent1 = agentStub(robotStub(1))
	local agent1send, agent1inbox = messaging:registerAgent(agent1)
	local agent2 = agentStub(robotStub(2))
	local agent2send, _ = messaging:registerAgent(agent2)
	local agent3 = agentStub(robotStub(3))
	local agent3send, _ = messaging:registerAgent(agent3)
	local trainerSend, trainerInbox = messaging:registerTrainer()
	assert_error(function() messaging:registerTrainer() end, "trainer may only registered once")

	assert_error(function() agent2send.foo(agent1:robot(), dummyMsg) end,
			"sending an invalid message shall fail")
	assert_error(function() agent3send.moveDest(agent2:robot(), "bla") end,
			"messages shall be type-checked")

	agent1send.moveDest("all", Vector(0,0))
	messaging:deliverMessages()
	assert_nil(agent1inbox.moveDest()[agent1:robot()],
			"broadcasts shall not be received by the sender")

	--agent1send(agent2:robot(), "moveDest", Vector(0,0))
	agent3send.moveDest("all", Vector(0,0))
	messaging:deliverMessages()
	agent2 = agentStub(agent2:robot())
	local agent2inbox
	agent2send, agent2inbox = messaging:registerAgent(agent2)
	assert_nil(agent2inbox.moveDest()[agent1:robot()],
			"new agents shall get no messages which were sent to its robot when they had the old agent")
	assert_not_nil(agent2inbox.moveDest()[agent3:robot()],
			"new agents shall receive broadcasts")

	agent2send.exclusiveRole("trainer", {mainAttacker = 1})
	agent1send.exclusiveRole("trainer", {mainAttacker = 0.5})

	-- note that trainer can receive without calling deliverMessages() before
	local applications = trainerInbox.exclusiveRole()
	assert_equal(fold(applications[agent1:robot()]).mainAttacker, 0.5,
			"mainAttacker rating of robot 1 shall be 0.5")

	trainerSend.mainAttacker("all", agent2:robot())
	assert_equal(trainerInbox.mainAttacker().trainer, agent2:robot(),
			"Trainer shall receive its own broadcasts")
	messaging:deliverMessages()
	assert_equal(agent1inbox.mainAttacker().trainer, agent2:robot(),
			"Robot 2 shall get the mainAttacker role")

	agent1send.groupApplication("trainer", { name = "A", payload = {"payload_A"} })
	agent1send.groupApplication("trainer", { name = "B", payload = {"payload_B"} })
	local groupApplications = trainerInbox.groupApplication()
	assert_equal(#groupApplications[agent1:robot()], 2)
	assert_deep_equal(groupApplications[agent1:robot()][1].payload, {"payload_A"})
	assert_deep_equal(groupApplications[agent1:robot()][2].payload, {"payload_B"})
end)
