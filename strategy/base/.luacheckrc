return {
	std = "luajit",
	read_globals = { "Vector", "log", "amun", "math", "table" },
	self = false,
	ignore = {
		"212/_.*", -- filter unused argument, if variable starts with underscore (_)
		"611", "612", "614", -- filter trailing whitespace / empty lines with spaces
		"631", -- filter lines with more than 120 characters
	},
}
