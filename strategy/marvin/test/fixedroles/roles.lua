local roles = {
	Agent = {
		"attacker",
		"defender",
		"keeper",
		"hidden",
		"manual",
	},
	Behavior = {
		"attacker/kickoffoffensive",
		"attacker/shoot",
		"attacker/penalty",
		"attacker/freekick",
		"attacker/duel",
		"attacker/distractor",
		"attacker/freekickdefender",
		"attacker/kickoffassistant",
		"attacker/stop",
		"attacker/applyformainattacker",
		"attacker/default",

		"defender/kickoffoffensive",
		"defender/penalty",
		"defender/handleball",
		"defender/default",
		"defender/centerback",

		"keeper/handleball",
		"keeper/default",

		"hidden/default",
		"manual/default"
	},
	Task = {
		"aggressivekeeper",
		"assistant",
		"centerback",
		"chipaway",
		"defendpenalty",
		"pass",
		"distractor",
		"duel",
		"farmirror",
		"halt",
		"keeper",
		"kickoffmirror",
		"manmark",
		"manual",
		"movetopos",
		"passintherun",
		"passreceiver",
		"rescuerobot",
		"shootgoal",
		"shootpenalty",
		"stopattack",
		"volley"
	}
}

local roleStrings = {}
for type, collection in pairs(roles) do
	for _, name in ipairs(collection) do
		table.insert(roleStrings, type .. "/" .. name)
	end
end

return roleStrings
