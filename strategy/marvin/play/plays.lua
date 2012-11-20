--- Loads every play and publishes test functions
local Plays = {
	KickoffOffensive = require "play/kickoffoffensive"
	-- TODO: add plays
}

for name,s in pairs(Plays) do
	if type(s) == "table" then
		if type(s.test) == "function" then -- check if play has test function
			Entrypoints["plays/" .. name] = function ()
				s.test(s)
			end
		end
	else
		error("Invalid play! " .. name)
	end
end

return Plays
