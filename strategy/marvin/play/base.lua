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
Base.maxRating = Base.rating.yes

function Base:init(msg, poolRobots)
	-- keep for lazy initialization
	self._messages = msg
	self.__poolRobots = poolRobots
	
	self._state = nil
	self._tasks = {}
	self._robots = nil
	self.__startTime = World.Time
	self:_init()
end

function Base:_init()
	error("stub")
end

-- rate[State] is always called if the play is useable
function Base:rate(minRequired, isInit)
	-- check for timeout
	if World.Time > self.__startTime + self.timeout then
		return Base.rating.no
	end
	
	-- cancel play if a robot is missing
	if self:state() and self:_hasHiddenRobots() then
		return Base.rating.no
	end

	minRequired = minRequired or Base.rating.no
	-- check whether play can reach the required rating
	if minRequired > self.maxRating then
		return Base.rating.no
	end

	-- initialize on first run
	if not self:state() then
		-- assign robots
		self._robots = self:_selectRobots(self.__poolRobots)
		self._messages = nil
		self.__poolRobots = nil
		
		-- no suitable robots found -> abort
		if not self._robots or #self._robots == 0 then
			return Base.rating.no
		end
	
		-- set state calls switch[State] and thus musn't be called without robots
		self:_setState(self.startState)
	end
	
	-- get real rating
	local rating = self["rate" .. self._state](self, isInit)
	assert(rating ~= nil, "No rating returned!")
	return rating
end

function Base:_hasHiddenRobots()
	for _, task in pairs(self._tasks) do
		if not task:robot().isVisible then
			return true
		end
	end
	return false
end

-- the robots per pool tables are guaranteed to not change for the current frame
function Base:_selectRobots(poolRobots)
	error("stub")
	-- local robots = -- robots
	-- conditions
	-- use STATIC conditions, if possible!
	-- run and return robotmatcher
end

function Base:run()
	assert(self:state(), "A play with rating no must NEVER be run")
	
	-- setup logging
	debug.pushtop("Play")
	debug.set(nil, self.classNameShort .. "(" .. self._state .. ")")
	
	debug.push("Robots")
	for i, robot in ipairs(self._robots) do
		debug.set("Pos " .. tostring(i), robot.id)
	end
	debug.pop()
	
	-- switch state if neccessary
	local switch = "switch" .. self._state
	if self[switch] then
		self[switch](self)
	end
	
	-- create task assignment message
	local tasks = {}
	for _, task in pairs(self._tasks) do
		tasks[task:robot()] = task
	end
	
	-- cleanup
	debug.pop()
	
	return tasks
end

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
