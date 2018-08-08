local Base = Class("Group.Move.Base")

Base.Referee = require "../base/referee"

Base.MIN_ROBOTS = -1
Base.MAX_ROBOTS = -1


function Base.canStart()
	error("stub")
end

function Base.injectReferee(pseudoRef)
	Base.Referee = pseudoRef
end

function Base:_init()
	error("stub")
end

function Base:_canContinue()
	error("stub")
end

function Base:_updateTasks()
	error("stub")
end


function Base:init(robots, inbox)
	self._firstFrame = true
	self._robots = robots
	self._inbox = inbox
	self:_init()
end

function Base:updateTasks()
	local assignments, mainAttacker = self:_updateTasks()
	for _, assignment in pairs(assignments) do
		assignment.restart = assignment.restart or self._firstFrame -- TODO: test
	end
	self._firstFrame = false
	return assignments, mainAttacker
end


return Base
