return {
	std = "luajit",
	read_globals = { "Vector", "log", "amun" },
	self = false,
	ignore = {
		"143", -- filter accessing an undefined field of a global variable
		"212/_.*", -- filter unused argument, if variable starts with underscore (_)
		"611", "612", -- filter trailing whitespace / empty lines with spaces
		"631", -- filter lines with more than 120 characters
	},
}
