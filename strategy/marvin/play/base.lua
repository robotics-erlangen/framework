local Base = (require "base/class").new("Play.Base")

Base.rating = {
	no = 0,
	perhaps = 1,
	yes = 2,
	force = 3,
	referee = 4
}

Base.reason = {
	running = 0,
	finished = 1,
	aborted = 2
}

Base.weight = 1
Base.timeout = 15

function Base:init(tm, attackers, defenders)
	self._taskmanager = tm
	self:_init()
	self._robots, _ = self.selectRobots(attackers, defenders) -- assign robots
end

function Base:run()
	-- TODO: prepare logging
	-- TODO: state switcher
	-- TODO: finish logging
end

function Base:prepare...()
	error("stub")
end

function Base:handle...()
	error("stub")
end

function Base:_assignTactics(tactics)
	-- TODO: assign helper function
	-- TODO: assign according to internal robot list
end

function Base.selectRobots(attackers, defenders)
	error("stub")
	local robots = -- robots
	-- conditions
	-- run and return robotmatcher
end

function Base:state()
	-- TODO: return state name
end

function Base:setState(newState)
	-- TODO: new state the play is in
	-- TODO: call prepare...
end

function Base.startRating(attackers, defenders, minRequiredRating)
	error("stub")
	-- check for required robot count, referee command, ...
	-- use Base.selectRobots(attackers, defenders)
	-- return Base.rating
end

function Base:currentRating()
	error("stub")
	-- look at own robots
	-- check if play can proceed any further
	-- return Base.rating, Base.reason
end

return Base
