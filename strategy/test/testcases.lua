require "../base/base"

local tester = require "telescope/init"

local tests = {example = require "testcases/example"}

Entrypoints = {}
Entrypoints["all"] = function() 
	tester.execute(tests.example)
	error("done") --FIXME use os.exit()
end

return {name = "testcases", entrypoints = Entrypoints}