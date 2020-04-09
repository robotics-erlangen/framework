/**************************************************************************
*   Copyright 2020 Andreas Wendler                                        *
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

const getSelectedOptions = amun.getSelectedOptions;
const supportsDefaultValues = amun.SUPPORTS_OPTION_DEFAULT;

let options: [string, boolean][] = [];
let isFirstExecution: boolean = true;

function invertOptionName(name: string, defaultValue: boolean): string {
	const INVERTED_OPTION_TAG = " (inverted)";

	if (defaultValue) {
		return name;
	} else {
		return name + INVERTED_OPTION_TAG;
	}
}

/**
 * Adds an option and returns the value of this option for the current strategy execution
 * It **must** be called during the first strategy file execution, not during subsequent executions
 * @param name The name of the option to export
 * @param defaultValue The default value of the option
 * @returns The value of the option for the current strategy execution
 */
export function addOption(name: string, defaultValue: boolean = true): boolean {
	options.push([name, defaultValue]);

	if (!isFirstExecution) {
		throw new Error("Options must be added during the first strategy file execution");
	}

	if (!supportsDefaultValues && defaultValue === false) {
		name = invertOptionName(name, defaultValue);
		return getSelectedOptions().indexOf(name) === -1;
	} else {
		return getSelectedOptions().indexOf(name) > -1;
	}
}

export function getExportedOptions(): [string, boolean][] | string[] {
	isFirstExecution = false;

	if (supportsDefaultValues) {
		return options;
	} else {
		let simpleOptions: string[] = [];
		for (let option of options) {
			simpleOptions.push(invertOptionName(option[0], option[1]));
		}
		return simpleOptions;
	}
}

export function getExportName(): string {
	if (supportsDefaultValues) {
		return "optionsWithDefault";
	} else {
		return "options";
	}
}
