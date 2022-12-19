/**
 * @module base
 * Loads global modules. Also takes care of initializing the random number generator. <br/>
 * General informations: <br/>
 * The coordinate systems y-direction points towards the opponent goal. <br/>
 * The x-direction points from the left to the right border. <br/>
 * It is centered on the kickoff point. <br/>
 * Angles are oriented counter-clockwise, 0 points in positive x-direction. <br/>
 * Angles are measured in radians. <br/>
 * All lengths are unless specified otherwise denoted in meters.
 * Speed in m/s and acceleration in m/s^2.
 */

/**************************************************************************
*   Copyright 2015 Michael Eischer                                        *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

// the order of imports is important here, so proper grouping is impossible
/* eslint-disable import/order */

import "base/error";

import * as amunModule from "base/amun";

// leave the debugger at the top so that exceptions during the initial
// file run can dump variables
import "base/debugger";

import "base/mathutil";
import "base/path";
import "base/vector";

// preload classes that require access to the amun API
import { _setIsBlue } from "base/coordinates";
_setIsBlue(amun.isBlue());
import "base/debug";
import "base/debugcommands";
import "base/option";
import "base/plot";
import "base/robot";
import "base/trycatch";
import "base/vis";
import "base/world";

// prevent access to internal APIs
amunModule._hideFunctions();

// declare the always present 'require' function
declare global {
	function require(module: string, cleanRequire?: boolean, overlays?: { [name: string]: any }): any;
	function require(module: string[], cleanRequire?: boolean, overlays?: { [name: string]: any }): any[];
}

