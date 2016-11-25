local Groups = {}

local CenterBackGroup = require "groups/centerback"
local MoveGroup = require "groups/moves"

function Groups:init()
	local groupClasses = { CenterBackGroup, MoveGroup }

	self._groupList = {}
	for _,group in ipairs(groupClasses) do
		table.insert(self._groupList, group())
	end
end

function Groups:_runGroups()
	 -- robot -> { groupname -> application }
	local groupApplications = self._inbox.groupApplication()

	-- groupname -> { robot -> application }
	local robotApplications = {}
	-- groupname -> number
	local robotApplicationsSize = {}

	for _,group in ipairs(self._groupList) do
		robotApplications[group.name] = {}
		robotApplicationsSize[group.name] = 0
	end
	for robot, msg in pairs(groupApplications) do
		for _, app in ipairs(msg) do
			local application = robotApplications[app.name]
			if not application then
				error("No group with name '" .. app.name .. "' found")
			end
			application[robot] = app.payload
			robotApplicationsSize[app.name] = robotApplicationsSize[app.name] + 1
		end
	end

	for _,group in ipairs(self._groupList) do
		local nRobots = robotApplicationsSize[group.name]
		local messages = robotApplications[group.name]

		group:run(self._send, self._inbox, messages)
	end
end

return Groups
