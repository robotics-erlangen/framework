local Base = (require "../base/class").new("Behaviour.Base")

Base.State = {
	Inactive = 0,
	Active = 1,
	-- state transition from CoolDown to Active is forbidden!
	CoolDown = 2
}

-- see Behaviour.Group for details about using multiple behaviours
function Base:init(robot)
	self._task = nil
	self._state = Base.State.Inactive
	self._robot = robot
	self:_init()
end

function Base:_init()
end

-- isBehaviourChosen tells whether a behaviour has been selected yet
function Base:run(isBehaviourChosen, ownMessages, priorityMessages, notifications, trainerMessages)
	self._messages = ownMessages
	self._priorityMessages = priorityMessages
	self._notifications = notifications
	self._trainerMessage = trainerMessages

	local messages
	 -- abort if another behaviour was actived
	if self._state == Base.State.Active and isBehaviourChosen then
		self:_abort()
	end
	if not isBehaviourChosen or self._state ~= Base.State.Inactive then
		self._state, messages = self:_check()
		assert(not isBehaviourChosen or self._state ~= Base.State.Active, "only one behaviour may be active")
	end

	if self._state == Base.State.Active then
		self:_run()
		return self, messages
	else
		self._task = nil -- reset task
		return nil, messages
	end
end

-- check is only called when the behaviour could be activated or is in CoolDown
-- choose state from Base.State, must ensure proper handling of CoolDown
-- during CoolDown no messages should be sent without ensuring that it won't interfere with
-- the active behaviour, otherwise the following problem could show:
-- (it is also triggered by checking further inactive tasks once a behaviour is chosen)
-- if two behaviours of a single agent are each asking for a special task
-- the agent may get both special tasks but can only fullfil one and thus
-- causing one task to be missing
function Base:_check()
	error("stub")
	-- return state[, messages]
end

-- just create a task
-- the task is reset when the behaviour is not active
function Base:_run()
	error("stub")
	-- self._task = ...
end

-- can be overwritten
function Base:_abort()
	self._state = Base.State.Inactive
end

function Base:task()
	return self._task
end

return Base
