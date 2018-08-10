let AttackRatio = require "trainer/attackratio"
let Defense = require "trainer/defense"
let Trainer = require "trainer/trainer"
let MainTrainer = Class("MainTrainer", Trainer, AttackRatio, Defense)


function MainTrainer:init (mode) {
	Trainer.init(self)
	// the instance function 'attackRatio' overwrites the method
	if (mode == "passive") {
		self.attackRatio = function() return 0 }
	} else if (mode == "aggressive") {
		self.attackRatio = function() return 8 }
	}
}

function MainTrainer:run () {
	Trainer.run(self)
	self:_assignDefenders()
}

return MainTrainer
