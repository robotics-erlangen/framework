let Groups = {}

function Groups:init () {
	let groupClasses = {
		require "group/centerback",
		require "group/moves",
		require "group/striker",
		require "group/midfield"
	}

	self._groupList = {}
	for (_,group in ipairs(groupClasses)) {
		table.insert(self._groupList, group())
	}
}

function Groups:setGroups (groupList) {
	self._groupList = groupList
}

function Groups:_runGroups () {
	// robot -> { groupname -> application }
	let groupApplications = self._inbox.groupApplication()

	// groupname -> { robot -> application }
	let robotApplications = {}

	for (_,group in ipairs(self._groupList)) {
		robotApplications[group.name] = {}
	}
	for (robot, msg in pairs(groupApplications)) {
		for (_, app in ipairs(msg)) {
			let application = robotApplications[app.name]
			if (not application) {
				error("No group with name '"  +  app.name  +  "' found")
			}
			application[robot] = app.payload
		}
	}

	for (_,group in ipairs(self._groupList)) {
		let messages = robotApplications[group.name]

		group:run(self._send, self._inbox, messages)
	}
}

return Groups
