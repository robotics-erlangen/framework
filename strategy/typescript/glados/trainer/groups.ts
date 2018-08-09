local Groups = {}

function Groups:init()
	local groupClasses = {
		require "group/centerback",
		require "group/moves",
		require "group/striker",
		require "group/midfield"
	}

	self._groupList = {}
	for _,group in ipairs(groupClasses) do
		table.insert(self._groupList, group())
	end
end

function Groups:setGroups(groupList)
	self._groupList = groupList
end

function Groups:_runGroups()
	// robot -> { groupname -> application }
	local groupApplications = self._inbox.groupApplication()

	// groupname -> { robot -> application }
	local robotApplications = {}

	for _,group in ipairs(self._groupList) do
		robotApplications[group.name] = {}
	end
	for robot, msg in pairs(groupApplications) do
		for _, app in ipairs(msg) do
			local application = robotApplications[app.name]
			if not application then
				error("No group with name '" .. app.name .. "' found")
			end
			application[robot] = app.payload
		end
	end

	for _,group in ipairs(self._groupList) do
		local messages = robotApplications[group.name]

		group:run(self._send, self._inbox, messages)
	end
end

return Groups
