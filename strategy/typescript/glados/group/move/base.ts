let Base = Class("Group.Move.Base")

Base.Referee = require "../base/referee"

Base.MIN_ROBOTS = -1
Base.MAX_ROBOTS = -1


function Base.canStart () {
	error("stub")
}

function Base.injectReferee (pseudoRef) {
	Base.Referee = pseudoRef
}

function Base:_init () {
	error("stub")
}

function Base:_canContinue () {
	error("stub")
}

function Base:_updateTasks () {
	error("stub")
}


function Base:init (robots, inbox) {
	self._firstFrame = true
	self._robots = robots
	self._inbox = inbox
	self:_init()
}

function Base:updateTasks () {
	let assignments, mainAttacker = self:_updateTasks()
	for (_, assignment in pairs(assignments)) {
		assignment.restart = assignment.restart  ||  self._firstFrame // TODO: test
	}
	self._firstFrame = false
	return assignments, mainAttacker
}


return Base
