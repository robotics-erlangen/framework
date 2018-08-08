local Entrypoints = require "../base/entrypoints"

local function init()
	log("No function for debug chosen!")
end

Entrypoints.add("ObserverReplay", init)
