-- these tasks are available for fixed role assignment
local tasks = {
	"aggressivekeeper",
	"assistant",
	"centerback",
	"chipaway",
	"defendpenalty",
	"directpass",
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
	"passtarget",
	"rescuerobot",
	"shootgoal",
	"shootpenalty",
	"stopattack",
	"volley"
}

return table.map(tasks, function(t) return require("task/"..t) end)
