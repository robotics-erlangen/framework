local Moves = Class("Group.Moves")

local debug = require "../base/debug"

function Moves:init()
	self.name = "moves"
	self.moveList = {
		require "group/move/kickoff",
		require "group/move/kickoffdefensive",
		require "group/move/mrltestcorner",
		require "group/move/armada",
		-- require "group/move/overchip",
	}

	for _,move in ipairs(self.moveList) do
		if not move.MIN_ROBOTS or move.MIN_ROBOTS < 0
			or not move.MAX_ROBOTS or move.MAX_ROBOTS < move.MIN_ROBOTS then
			error("MIN_ROBOTS and/or MAX_ROBOT are invalid or not set!")
		end
	end

	self._numAttackersSent = false
	self._chosenMove = nil
	self._currentMove = nil
	self._participatingRobots = {}
end

local function validateAssignment(assignment)
	-- don't assing a task and a behavior
	if assignment.behavior and assignment.class then
		return false
	end

	--don't assing nothing
	if not assignment.behavior and not assignment.class then
		return false
	end

	return true
end

function Moves:run(sender, inbox, messages)
	-- check if all participating robots are still available
	if self._currentMove then
		for _,r in ipairs(self._participatingRobots) do
			if not messages[r] then
				self._currentMove = nil
				self._chosenMove = nil
				break
			end
		end
	end

	-- check if current move can be continued
	if self._currentMove and not self._currentMove:_canContinue() then
		self._currentMove = nil
		self._chosenMove = nil
		self._numAttackersSent = false
	end

	local n_attackers
	-- choose a new move
	if not self._chosenMove then
		local candidates = {}
		local numCandidateRobots = 0
		for _,_ in pairs(inbox.attackerFlag()) do
			numCandidateRobots = numCandidateRobots + 1
		end
		for _,_ in pairs(inbox.defenderFlag()) do
			numCandidateRobots = numCandidateRobots + 1
		end
		for _,move in ipairs(self.moveList) do
			if move.canStart() then
				if numCandidateRobots >= move.MIN_ROBOTS then
					table.insert(candidates, move)
				end
			end
		end

		if #candidates > 0 then
			local index = math.random(#candidates)
			self._chosenMove = candidates[index]
			n_attackers = math.min(numCandidateRobots, candidates[index].MAX_ROBOTS)
		end
	end

	if not self._currentMove and self._chosenMove then
		local availableRobots = {}
		for r,_ in pairs(messages) do
			table.insert(availableRobots, r)
		end

		if #availableRobots >= self._chosenMove.MIN_ROBOTS and
			#availableRobots <= self._chosenMove.MAX_ROBOTS and
			self._numAttackersSent then
			table.sort(availableRobots, function(a, b) return a.id < b.id end)
			self._currentMove = self._chosenMove(availableRobots, inbox)
			self._participatingRobots = availableRobots
		end
	end


	-- reset participating robots
	local prevParticipatingRobots = self._participatingRobots
	self._participatingRobots = {}

	-- run
	if self._currentMove then
		local taskAssignments, mainAttacker = self._currentMove:updateTasks()
		for _, robot in ipairs(prevParticipatingRobots) do
			local assignment = taskAssignments[robot]
			if assignment then
				if not validateAssignment(assignment) then
					for key,value in pairs(assignment) do
						log(tostring(key) .. " -> " .. tostring(value))
					end
					error("invalid assignment for robot " .. tostring(robot.id))
				end
				assignment.mainAttacker = robot == mainAttacker
				sender.moveAssignment(robot, assignment)
				table.insert(self._participatingRobots, robot)
			else
				sender.forcePoolChange("trainer", { robot = robot, destPool = "defender" })
			end
		end
		n_attackers = #self._participatingRobots
	end

	if self._chosenMove and n_attackers then
		assert(n_attackers)
		self._numAttackersSent = true
		sender.moveNumAttackers("trainer", n_attackers)
	end

	debug.push("Move")
	debug.set("ParticipatingRobots", self._participatingRobots)
	if self._currentMove then
		debug.set(nil, Class.name(self._currentMove, true))
	end
	debug.pop()
end

return Moves
