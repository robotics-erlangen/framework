local AggressiveKeeper = (require "../base/class").new("Task.AggressiveKeeper", require "task/base")

AggressiveKeeper.priority = 6

function AggressiveKeeper:_init()
end

function AggressiveKeeper:_run() 
	--TODO
end

function AggressiveKeeper:_rate()
	return self._robot == World.FriendlyKeeper and 1 or 0
end

function AggressiveKeeper.factory(position)
	local f = function (robots)
		return AggressiveKeeper.create(robots[position])
	end
	return f
end

function AggressiveKeeper.test(id)
	if id > 0 then
		return nil
	end
	return AggressiveKeeper.factory(1), 1
end

return AggressiveKeeper
