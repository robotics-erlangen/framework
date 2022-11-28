--[[***********************************************************************
*   Copyright 2022 Andreas Wendler, Michel Schmid                         *
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
**************************************************************************]]

local Option = {}

local getSelectedOptions = amun.getSelectedOptions
local supportsDefaultValues = amun.SUPPORTS_OPTION_DEFAULT

local options = {}
local isFirstExecution = true

local function invertOptionName(name, defaultValue)
	local INVERTED_OPTION_TAG = " (inverted)"

	if defaultValue then
		return name
	else
		return name .. INVERTED_OPTION_TAG
	end
end

--[[**
 * Adds an option and returns the value of this option for the current strategy execution
 * It **must** be called during the first strategy file execution, not during subsequent executions
 * @param name The name of the option to export
 * @param defaultValue The default value of the option
 * @returns The value of the option for the current strategy execution
 *]]
function Option.addOption(name, defaultValue)
	options[name] = defaultValue

	if not isFirstExecution then
		error("Options must be added during the first strategy file execution")
	end

	local selectedOptions = getSelectedOptions()
	if not supportsDefaultValues and defaultValue == false then
		name = invertOptionName(name, defaultValue)
		local exists = false
		for _,option in ipairs(selectedOptions) do
			if option == name then
				exists = true
				break
			end
		end
		return not exists
	else
		local exists = false
		for _,option in ipairs(selectedOptions) do
			if option == name then
				exists = true
				break
			end
		end
		return exists
	end
end

function Option:getExportedOptions()
	isFirstExecution = false

	if supportsDefaultValues then
		return options
	else
		local simpleOptions = {}
		local i = 1;
		for name,defaultValue in pairs(options) do
			simpleOptions[i] = invertOptionName(name, defaultValue)
			i = i + 1
		end
		return simpleOptions
	end
end

function Option:getExportName()
	if supportsDefaultValues then
		return "optionsWithDefault";
	else
		return "options";
	end
end

return Option
