local Base = (require "../base/class").new("Play.Base")
local World = require "../base/world"
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
Base.startState = "Default"

function Base:init(tm, attackers, defenders)
	self._taskmanager = tm
	-- keep for lazy initialization
	self._attackers = attackers
	self._defenders = defenders
	
	self._state = nil
	self._tasks = {}
	self._startTime = World.Time
	self._ratingRun = false
	self:_init()
end

function Base:_init()
	error("stub")
end

function Base:rate(minRequired, isInit)
	-- check for timeout
	if World.Time > self._startTime + self.timeout then
		return Base.rating.no
	end
	
	-- cancel play if a robot is missing
	if self:state() and self:_hasHiddenRobots() then
		return Base.rating.no
	end

	minRequired = minRequired or Base.rating.no
	local rating = self:_baseRating(minRequired)
	if rating then
		return rating
	end

	if not self:state() then
		self:_initState()
		
		if not self._robots then
			return Base.rating.no
		end
	end
	
	self._ratingRun = true
	return self["rate" .. self._state](self, isInit)
end

function Base:_baseRating(minRequired)
	error("stub")
end

function Base:_initState()
	self._robots = self:_selectRobots(self._attackers, self._defenders) -- assign robots
	self._attackers = nil
	self._defenders = nil
	
	if not self._robots then
		return
	end
	
	self:_setState(self.startState)
end

function Base:_hasHiddenRobots()
	for _, task in pairs(self._tasks) do
		if not task:robot().isVisible then
			return true
		end
	end
	return false
end

-- the attackers and defenders table are guaranteed to not change for the current frame
function Base:_selectRobots(attackers, defenders)
	error("stub")
	-- local robots = -- robots
	-- conditions
	-- use STATIC conditions, if possible!
	-- run and return robotmatcher
end

function Base:run()
	-- setup logging
	debug.pushtop("Play")
	debug.set(nil, self.classNameShort .. "(" .. self._state .. ")")
	
	debug.push("Robots")
	for i, robot in ipairs(self._robots) do
		debug.set("Pos " .. tostring(i), robot.id)
	end
	debug.pop()
	
	if not self:state() then
		self:_initState()
		if not self._robots then
			error("Where are my robots?")
		end
	end
	
	if not self._ratingRun then
		self["rate" .. self._state](self)
	end
	
	-- switch state if neccessary
	local switch = "switch" .. self._state
	if self[switch] then
		self[switch](self)
	end
	
	-- apply tasks
	for _, task in pairs(self._tasks) do
		self._taskmanager:assign(task)
	end
	
	-- cleanup
	debug.pop()
	self._ratingRun = false
end

--function Base:rate<Default>()
	--error("stub")
--end

--function Base:rate...()
	--error("stub")
--end

--function Base:prepare...()
	--error("stub")
--end

--function Base:switch...()
	--error("stub")
--end

function Base:state()
	return self._state
end

function Base:_setState(newState)
	self._state = newState -- change state
	self["prepare" .. self._state](self)
end

return Base
