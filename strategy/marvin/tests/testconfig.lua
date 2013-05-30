local TestConfig = {
	-- specifies a test constellation, all pools and behaviours are fixed
	pools = {
		{ Attacker = 0 }, -- number of robots in pool
		{ Defender = 0 },
		{ Keeper = 1 },
		{ Hidden = 0 },
	},
	behaviours = {
		'AttackerDefaultDuel', -- one robot with specific behaviour (never changes!)
		'DefenderDefault',
	}
}
return TestConfig