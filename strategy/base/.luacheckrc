return {
	std = "luajit",
	read_globals = { "Vector", "log", "amun" },
	self = false,
	ignore = {
		"212/_.*", -- filter unused argument, if variable starts with underscore (_)
		"611", "612", -- filter trailing whitespace / empty lines with spaces
	},
}
