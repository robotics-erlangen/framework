let Base = Class("Group.Move.Base")

Base.Referee = require "+/base/referee"

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
	this._firstFrame = true
	this._robots = robots
	this._inbox = inbox
	this._init()
}

function Base:updateTasks () {
	let assignments, mainAttacker = this._updateTasks()
	for (_, assignment in pairs(assignments)) {
		assignment.restart = assignment.restart || this._firstFrame // TODO: test
	}
	this._firstFrame = false
	return assignments, mainAttacker
}


return Base
