local Armada = Class("Group.Move.Armada", require "groups/moves/base")

Armada.MIN_ROBOTS = 4

function Armada.canStart()
	return false
end

function Armada.chooseRobots(availableRobots)
	-- TODO
end

function Armada:init(robots)
	-- TODO
end

function Armada:canContinue()
	-- TODO
end

function Armada:updateTasks()
	-- TODO
end

return Armada