local telescope = require "telescope/telescope"
local luassert = require "luassert/init"

if not pcall(require, 'debug') then 
	error("Debugging not enabled!") 
end

--include useful assertions from luassert with 'telescope.make_assertion'
--luassert: http://olivinelabs.com/busted/#asserts
telescope.make_assertion("has_errors", "%s contains errors",
  function(f) return luassert.has.errors(f) end)

function telescope.execute (test_func)
	local contexts = telescope.load_contexts(test_func)
	local results = telescope.run(contexts)
	local summary, data = telescope.summary_report(contexts, results)
	local report = telescope.error_report(contexts, results)
	-- TODO: 
	-- nice output, use colors
	-- example output: https://github.com/norman/telescope/blob/master/tsc
	log(summary)
end

return telescope