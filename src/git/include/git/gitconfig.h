/***************************************************************************
 *   Copyright 2021 Tobias Heineken                                        *
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
 ***************************************************************************/

#ifndef GITCONFIG_H
#define GITCONFIG_H
#include <string>
namespace gitconfig {
    // These functions are used to avoid recompilation whenever the current hash and diff changes.
    /**
     * Return the result of `git diff-index HEAD -p --no-color --ignore-cr-at-eol` at built time,
     * restricted to changes that are relevant for the binary (/src and /cmake)
     */
    const char* const getErforceCommitDiff();
    /**
     * Return the result of `git rev-parse HEAD` at built time.
     */
    const char* const getErforceCommitHash();

    /**
     * Return the result of `git rev-parse HEAD` at run time,
     * for a folder or file under version control at path
     */
    std::string getLiveCommitHash(const char* path);
    /**
     * Return the result of `git diff-index HEAD -p --no-color` at run time,
     * restricted to changes in path
     *
     * This function expects `path` to be absolute and canonical
     * without '.' or '..'. It also expects to be ending in a /.
     */
    std::string getLiveCommitDiff(const char* path);
}
#endif // GITCONFIG_H
