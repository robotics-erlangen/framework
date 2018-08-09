local AttackRatio = require "trainer/attackratio"
local Defense = require "trainer/defense"
local Trainer = require "trainer/trainer"
local MainTrainer = Class("MainTrainer", Trainer, AttackRatio, Defense)


function MainTrainer:init(mode)
	Trainer.init(self)
	// the instance function 'attackRatio' overwrites the method
	if mode == "passive" then
		self.attackRatio = function() return 0 end
	elseif mode == "aggressive" then
		self.attackRatio = function() return 8 end
	end
end

function MainTrainer:run()
	Trainer.run(self)
	self:_assignDefenders()
end

return MainTrainer
