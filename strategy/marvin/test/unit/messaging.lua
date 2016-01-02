local World = require "../base/world"
local AgentAttacker = require "agent/attacker"
local Messaging = require "control/messaging"
local ShootGoal = require "task/shootgoal"


return function()
	assert(World.FriendlyRobots[3], "this test needs 3 robots on the field")
	local dummyMsg = 2
	local agent1 = AgentAttacker(World.FriendlyRobots[1])
	local agent1send, agent1inbox = Messaging.registerAgent(agent1)
	local agent2 = AgentAttacker(World.FriendlyRobots[2])
	local agent2send, agent2inbox =Messaging.registerAgent(agent2)
	local agent3 = AgentAttacker(World.FriendlyRobots[3])
	local agent3send, agent3inbox = Messaging.registerAgent(agent3)
	local trainerSend, trainerInbox = Messaging.registerTrainer()
	local noFail, msg = pcall(Messaging.registerTrainer)
	assert(not noFail, "trainer may only registered once")

	local noFail, msg = pcall(agent2send.foo, agent1:robot(), dummyMsg)
	assert(not noFail, "sending an invalid message shall fail")
	local noFail, msg = pcall(agent3send.moveDestDir, agent2:robot(), dummyMsg)
	assert(noFail, "sending a moveDestDir message shall be possible")
	local noFail, msg = pcall(agent3send.moveDestDir, agent2:robot(), "bla")
	assert(not noFail, "messages shall be type-checked")

	agent1send.moveDest("all", Vector(0,0))
	Messaging.deliverMessages()
	assert(not agent1inbox.moveDest()[agent1:robot()], "broadcasts shall not be received by the sender")

	--agent1send(agent2:robot(), "moveDest", Vector(0,0))
	agent3send.moveDest("all", Vector(0,0))
	Messaging.deliverMessages()
	agent2 = AgentAttacker(World.FriendlyRobots[2])
	agent2send, agent2inbox = Messaging.registerAgent(agent2)
	assert(not agent2inbox.moveDest()[agent1:robot()],
		" new agents shall get no messages which were sent to its robot when they had the old agent")
	assert(agent2inbox.moveDest()[agent3:robot()],
		"new agents shall receive broadcasts")

	agent2send.exclusiveRole("trainer", {mainAttacker = 1})
	agent1send.exclusiveRole("trainer", {mainAttacker = 0.5})

	-- note that trainer can receive without calling deliverMessages() before
	local applications = trainerInbox.exclusiveRole()
	assert(applications[agent2:robot()].mainAttacker == 1,
		"mainAttacker rating of robot 2 shall be 1")
	assert(applications[agent1:robot()].mainAttacker == 0.5,
		"mainAttacker rating of robot 1 shall be 0.5")

	trainerSend.mainAttacker("all", agent2:robot())
	assert(trainerInbox.mainAttacker().trainer == agent2:robot()
		, "Trainer shall receive its own broadcasts")
	Messaging.deliverMessages()
	assert(agent1inbox.mainAttacker().trainer == agent2:robot()
		, "Robot 2 shall get the mainAttacker role")
end
