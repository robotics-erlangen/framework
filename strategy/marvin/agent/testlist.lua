-- these agent types and behaviors are available for fixed role assignment
local agents = {
	"attacker",
	"defender",
	"keeper",
	"hidden",
	"manual",
}
local behaviors = {
	"attacker/kickoffoffensive",
	"attacker/shoot",
	"attacker/penalty",
	"attacker/freekick",
	"attacker/duel",
	"attacker/distractor",
	"attacker/receivepass",
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
}

local function loadAgentFile(file)
	return require ("agent/" .. file)
end
return {
	behaviors = table.map(behaviors, loadAgentFile),
	agents = table.map(agents, loadAgentFile)
}
