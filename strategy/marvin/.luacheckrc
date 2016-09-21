return {
	std = "luajit",
	read_globals = { "Class", "Vector", "log", "amun" },
	self = false,
	unused = false,
	unused_args = false,
	unused_secondaries = false,
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
}
