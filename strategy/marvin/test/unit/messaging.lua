local World = require "../base/world"
local Messaging = require "control/messaging"
local AgentAttacker = require "agent/attacker"
local ShootGoal = require "task/shootgoal"

return function()
	assert(World.FriendlyRobots[3], "this test needs 3 robots on the field")
	local dummyMsg = 2
	local agent1 = AgentAttacker.create(World.FriendlyRobots[1])
	Messaging.registerAgent(agent1)
	local agent1send = Messaging.getSender(agent1, 1) -- priority 1
	local agent1inbox = Messaging.getInbox(agent1, 1)
	local agent2 = AgentAttacker.create(World.FriendlyRobots[2])
	Messaging.registerAgent(agent2)
	local agent2send = Messaging.getSender(agent2, 2) -- priority 2
	local agent2inbox = Messaging.getInbox(agent2, 2)
	local agent3 = AgentAttacker.create(World.FriendlyRobots[3])
	Messaging.registerAgent(agent3)
	local agent3send = Messaging.getSender(agent3, 3) -- priority 3
	local agent3inbox = Messaging.getInbox(agent3, 3)
	Messaging.deliverMessages() -- initializes the module

	local noFail, msg = pcall(agent2send(agent2:robot()).foo, dummyMsg)
	assert(not noFail, "sending an invalid message shall fail")
	local noFail, msg = pcall(agent3send(agent2:robot()).moveDestDir, dummyMsg)
	assert(noFail, "cannot send moveDestDir message")

	agent2send("all").moveDestDir(dummyMsg)
	Messaging.deliverMessages()
	local msg1 = agent3inbox.moveDestDir()[agent2:robot()]
	assert(not msg1, "robots shall not receive messages with lower priority")
	local msg2 = agent3inbox.moveDestDir("ignorePriority")[agent2:robot()]
	assert(msg2, "robots shall be able to ignore priorities")
	local msg3 = agent1inbox.moveDestDir()[agent2:robot()]
	assert(msg3, "robots shall receive messages with higher priority")
	
	agent2send(agent3:robot()).moveDestDir(dummyMsg) -- task is currently nil
	Messaging.deliverMessages()
	agent2:setTask(ShootGoal.create(agent2))
	local msg4 = agent3inbox.moveDestDir("ignorePriority")[agent2:robot()]
	assert(not msg4, "messages from non-existent tasks shall not be delivered")

	agent2send("trainer").specialRole({mainAttacker = 1})
	agent1send("trainer").specialRole({mainAttacker = 0.5})
	local mAApplications = Messaging.getSpecialRoleApplications()['mainAttacker']
	assert(mAApplications[agent2:robot()] == 1,
		"mainAttacker rating of robot 2 shall be 1")
	assert(mAApplications[agent1:robot()] == 0.5,
		"mainAttacker rating of robot 1 shall be 0.5")
	Messaging.sendSpecialRole("mainAttacker", agent2:robot())
	Messaging.deliverMessages()
	assert(agent1inbox.mainAttacker().trainer == agent2:robot()
		, "Robot 2 shall get the mainAttacker role")
end