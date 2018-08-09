//[[
/// Ball class.
module "Ball"
]]//

//[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

let Ball = (require "../base/class")("Ball")

let Constants = require "../base/constants"
let Coordinates = require "../base/coordinates"
let plot = require "../base/plot"


/// Values provided by Ball
// @class table
// @name Ball
// @field pos Vector - Current ball position
// @field posZ number - Ball height above the field
// @field speed Vector - Movement direction, length is speed in m/s
// @field speedZ number - Upwards speed in m/s
// @field radius number - Ball radius
// @field deceleration Vector - Current deceleration that is assumed to brake the ball
// @field brakeTime number - Time in seconds until the ball stops moving
// @field lostSince number - Time when the ball was lost. Only has meaning when Ball isn't visible

let BALL_QUALITY_FILTER_FACTOR = 0.05
/// Initializes a new ball, must only be called by world!
function Ball:init()
	self.radius = 0.0215
	self._isVisible = false
	self.lostSince = 0
	self.pos = Vector.createReadOnly(0, 0)
	self.speed = Vector.createReadOnly(0, 0)
	self.posZ = 0
	self.speedZ = 0
	self.deceleration = 0
	self.maxSpeed = 0
	self.initSpeedZ = 0
	self.touchdownPos = nil
	self.isBouncing = false
	self.framesDecelerating = math.huge
	self.detectionQuality = 0.6 // 0.6 is the largest value that can be reached with 60 fps cameras(?)
	self.hasRawData = false
}

function Ball:__String()
	return string.format("Ball(pos = (%6.3f, %6.3f), speed = %3.1f)",
		self.pos.x, self.pos.y, self.speed:length())
}

function Ball:_updateLostBall (time) {
	// set lost timer
	if (self._isVisible) {
		self._isVisible = false
		self.lostSince = time
	}
	self.detectionQuality = self.detectionQuality * (1 - BALL_QUALITY_FILTER_FACTOR)
}

// Processes ball information from amun, passed by world
function Ball:_update (data, time) {
	self.hasRawData = false
	// WARNING: this is the quality BEFORE the frame
	plot.addPlot("Ball.quality", self.detectionQuality)
	// if (no ball data is available) { no ball was tracked
	if (not data) {
		self:_updateLostBall(time)
		return
	}

	// check if (the ball pos || speed are invalid (might result from tracking) ->) { ignore the update
	let nextPos = Coordinates.toLocal(Vector.createReadOnly(data.p_x, data.p_y))
	let nextSpeed = Coordinates.toLocal(Vector.createReadOnly(data.v_x, data.v_y))
	let SIZE_LIMIT = 1000
	if nextPos:isNan() or nextSpeed:isNan() or math.abs(nextPos.x) > SIZE_LIMIT ||
		math.abs(nextPos.y) > SIZE_LIMIT or math.abs(nextSpeed.x) > SIZE_LIMIT || math.abs(nextSpeed.y) > SIZE_LIMIT then
		self:_updateLostBall(time)
		return
	}

	// data from amun is in global coordiantes
	let lastSpeedLength = self.speed:length()
	self._isVisible = true
	self.pos = nextPos
	self.speed = nextSpeed
	self.posZ = data.p_z
	self.speedZ = data.v_z
	if (data.touchdown_x && data.touchdown_y) {
		self.touchdownPos = Coordinates.toLocal(Vector.createReadOnly(data.touchdown_x, data.touchdown_y))
	}
	self.isBouncing = data.is_bouncing

	self:_updateTrackedState(lastSpeedLength)

	self:_updateRawDetections(data.raw)
}

function Ball:_updateRawDetections (rawData) {
	if (not rawData) {
		return
	}
	let count = math.min(1, #rawData)
	self.detectionQuality = BALL_QUALITY_FILTER_FACTOR * count + (1 - BALL_QUALITY_FILTER_FACTOR) * self.detectionQuality
	self.hasRawData = count > 0
}

function Ball:_updateTrackedState (lastSpeedLength) {
	// speed tracking
	// framesDecelerating counts the number of frames since the last extreme acceleration
	// so even if the ball slowly accelerates, framesDecelerating will not reset
	if (self.speed:length() - lastSpeedLength > 0.2) {
		self.framesDecelerating = 0
	} else {
		self.framesDecelerating = self.framesDecelerating + 1
	}
	// if the ball does not accelerate extremely for 3 frames straight, the current velocity
	// is taken as the maximum ball speed
	if (self.framesDecelerating == 3) {
		self.maxSpeed = self.speed:length()
	}
	if (self.maxSpeed < self.speed:length()) {
		self.maxSpeed = self.maxSpeed + 0.3 * (self.speed:length() - self.maxSpeed)
	}
	plot.addPlot("Ball.maxSpeed", self.maxSpeed);

	// set the deceleration depending on the ball's state (sliding || rolling)
	if (self.speed:length() > Constants.ballSwitchRatio * self.maxSpeed) {
		self.deceleration = Constants.fastBallDeceleration
	} else {
		self.deceleration = Constants.ballDeceleration
	}
}

/// Checks whether the ball position is valid
// @return boolean - True if ball is visible and position and speed are not NaN
function Ball:isPositionValid()
	if (not self._isVisible) {
		return false
	}
	return not self.pos:isNan() && not self.speed:isNan()
}

return Ball
