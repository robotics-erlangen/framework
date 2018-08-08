local Injector = require "test/unit/injector"

test("base.process", function()
	local Process = require "../base/process"
	local instance = Process()
	assert_error(function() instance:run() end, "Expected error from stub")
	assert_error(function() instance:isFinished() end, "Expected error from stub")
end)

context("base.processor", function()
	local Processor, Process, SpyProcess, Class

	before(function()
		Class = Injector.newClassLoader()
		local injector = Injector(Class, true)
		Process = injector:load("../base/process")

		SpyProcess = Class("SpyProcess", Process)
		function SpyProcess:init()
			self.counter = 0
			self.finished = false
		end
		function SpyProcess:run() self.counter = self.counter + 1 end
		function SpyProcess:isFinished() return self.finished end

		Processor = injector:load("../base/processor")
	end)

	test("invalid type", function()
		-- must be of type processor
		assert_error(function() Processor.addPre({}) end)
		assert_error(function() Processor.addPost({}) end)
	end)

	test("correct pre and post", function()
		local preInstance = SpyProcess()
		local postInstance = SpyProcess()
		Processor.addPre(preInstance)
		assert_equal(preInstance.counter, 0)
		Processor.pre()
		assert_equal(preInstance.counter, 1)
		assert_equal(postInstance.counter, 0)
		Processor.post()
		assert_equal(preInstance.counter, 1)
		assert_equal(postInstance.counter, 0)
		Processor.addPost(postInstance)
		assert_equal(preInstance.counter, 1)
		assert_equal(postInstance.counter, 0)
		Processor.pre()
		assert_equal(preInstance.counter, 2)
		assert_equal(postInstance.counter, 0)
		Processor.post()
		assert_equal(preInstance.counter, 2)
		assert_equal(postInstance.counter, 1)
	end)

	test("finished process", function()
		local instance = SpyProcess()
		Processor.addPre(instance)
		assert_equal(instance.counter, 0)
		Processor.pre()
		assert_equal(instance.counter, 1)
		instance.finished = true
		Processor.pre()
		assert_equal(instance.counter, 2)
		-- check that process is removed
		Processor.pre()
		assert_equal(instance.counter, 2)

		-- an already finished process is run exactly once
		Processor.addPre(instance)
		Processor.pre()
		assert_equal(instance.counter, 3)
		Processor.pre()
		assert_equal(instance.counter, 3)
	end)
end)
