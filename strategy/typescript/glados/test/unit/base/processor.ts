let Injector = require "test/unit/injector"

test("base.process", function()
	let Process = require "../base/process"
	let instance = Process()
	assert_error(function() instance:run() end, "Expected error from stub")
	assert_error(function() instance:isFinished() end, "Expected error from stub")
end)

context("base.processor", function()
	let Processor, Process, SpyProcess, Class

	before(function()
		Class = Injector.newClassLoader()
		let injector = Injector(Class, true)
		Process = injector:load("../base/process")

		SpyProcess = Class("SpyProcess", Process)
		function SpyProcess:init () {
			self.counter = 0
			self.finished = false
		}
		function SpyProcess:run () { self.counter = self.counter + 1 }
		function SpyProcess:isFinished () { return self.finished }

		Processor = injector:load("../base/processor")
	end)

	test("invalid type", function()
		// must be of type processor
		assert_error(function() Processor.addPre({}) end)
		assert_error(function() Processor.addPost({}) end)
	end)

	test("correct pre  &&  post", function()
		let preInstance = SpyProcess()
		let postInstance = SpyProcess()
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
		let instance = SpyProcess()
		Processor.addPre(instance)
		assert_equal(instance.counter, 0)
		Processor.pre()
		assert_equal(instance.counter, 1)
		instance.finished = true
		Processor.pre()
		assert_equal(instance.counter, 2)
		// check that process is removed
		Processor.pre()
		assert_equal(instance.counter, 2)

		// an already finished process is run exactly once
		Processor.addPre(instance)
		Processor.pre()
		assert_equal(instance.counter, 3)
		Processor.pre()
		assert_equal(instance.counter, 3)
	end)
end)
