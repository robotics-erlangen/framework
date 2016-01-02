local Roles = {}

local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local Messaging = require "control/messaging"


local ROLE_HYSTERESIS = 0.05

function Roles:init()
    self._exclusiveRoles = {}
end

function Roles:_chooseExclusiveRoles()
	local roleHysteresis = ROLE_HYSTERESIS
    if Referee.isStopState() then
    	roleHysteresis = math.huge
	end

	local roleMsgs = self._inbox.exclusiveRole()
	local roleApplications = {}
	for robot, application in pairs(roleMsgs) do
		for role, rating in pairs(application) do
			if not roleApplications[role] then
				roleApplications[role] = {}
			end
			roleApplications[role][robot] = rating
		end
	end

	local exclusiveRoles = {} -- ensure that special roles are removed if no one applies
	for role, applications in pairs(roleApplications) do
		local bestRobot = nil
		local bestRating = -math.huge
		for robot, rating in pairs(applications) do
			if self._exclusiveRoles[role] == robot then
				rating = rating + roleHysteresis
			end
			if rating > bestRating then
				bestRobot = robot
				bestRating = rating
			end
		end
		if bestRobot then
			exclusiveRoles[role] = bestRobot
			self._send[role]("all", bestRobot)
		end
	end
	self._exclusiveRoles = exclusiveRoles
end

return Roles
