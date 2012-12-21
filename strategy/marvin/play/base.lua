local Base = (require "../base/class").new("Play.Base")
local debug = require "../base/debug"

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
	self._robots, _ = self.selectRobots(attackers, defenders) -- assign robots
	self:_init()
end

function Base:run()
	-- setup logging
	debug.pushtop("Play")
	debug.set(nil, self.className)
	debug.set("robots", self._robots)
	
	-- call active state
	self["handle" .. self._state](self)
	
	-- cleanup
	debug.pop()
end

--function Base:prepare...()
	--error("stub")
--end

--function Base:handle...()
	--error("stub")
--end

function Base:_assignTasks(tasks)
	for _, task in pairs(tasks) do
		self._taskmanager:assign(task)
	end
end

function Base.selectRobots(attackers, defenders)
	error("stub")
	-- local robots = -- robots
	-- conditions
	-- run and return robotmatcher
end

function Base:state()
	return self._state
end

function Base:setState(newState)
	self._state = newState -- change state
	self["prepare" .. self._state](self)
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
