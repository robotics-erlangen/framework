return {
	std = "luajit",
	read_globals = { "Class", "Vector", "log", "amun" },
	self = false,
	files = {
		["test"] = { redefined = false },
		["test/unit"] = {
			read_globals = { "context", "test", "before", "after",
				"assert_blank", "assert_empty", "assert_equal", "assert_error",
				"assert_false", "assert_greater_than", "assert_gte",
				"assert_less_than", "assert_lte", "assert_match", "assert_nil",
				"assert_true", "assert_type", "assert_not_blank",
				"assert_not_empty", "assert_not_equal", "assert_not_error",
				"assert_not_match", "assert_not_nil", "assert_not_type",
				"assert_equal_eps", "assert_not_equal_eps", "assert_deep_equal",
				"assert_not_deep_equal" }
		},
	},
	ignore = {
		"143", -- filter accessing an undefined field of a global variable
		"212/_.*", -- filter unused argument, if variable starts with underscore (_)
		"611", "612", -- filter trailing whitespace / empty lines with spaces
		"631", -- filter lines with more than 120 characters
	},
}
