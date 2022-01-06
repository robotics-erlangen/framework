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
     * Return the result of `git diff-index master@{u} -p --no-color --ignore-cr-at-eol` at built time,
     * restricted to changes that are relevant for the binary (/src and /cmake)
     */
    const char* const getErforceReliableCommitDiff();
    /**
     * Return the result of `git rev-parse master@{u}` at built time.
     */
    const char* const getErforceReliableCommitHash();

    struct TreeDescriptor {
        std::string hash; /* The result of `git rev-parse ABC` */
        std::string diff; /* The result of diff-index ABC -p --no-color */
        std::string min_hash; /* An optional result of `git rev-parse DEF` that is not consistant with diff, but that (assuming it is found on your repository) should create a quite small diff */
        std::string error; /* If any error occured, this will be a description of said error, otherwise empty */
    };

    /**
     * Return the result of `git rev-parse HEAD` at run time,
     * for a folder or file under version control at path
     */
//    std::string getLiveCommitHash(const char* path);
    /**
     * Return the result of `git diff-index HEAD -p --no-color` at run time,
     * restricted to changes in path
     *
     * This function expects `path` to be absolute and canonical
     * without '.' or '..'. It also expects to be ending in a /.
     */
//    std::string getLiveCommitDiff(const char* path);

    /**
     * Return the TreeDescriptor for either master@{u} or HEAD at run time,
     * changes restricted to path.
     *
     * This function expected `path` to be absolute and canonical
     * without '.' or '..'. It also expects to be ending in a /.
     */
    TreeDescriptor getLiveCommit(const char* path);

    /**
     * Return the diff between the state denoted by orig_hash and orig_diff on the one side,
     * and diff_hash on the other side.
     * The result can be observed with the following git commands:
     * ```
     *  git checkout orig_hash
     *  git checkout -b new_branch
     *  git apply orig_diff
     *  git commit -m "TEMP"
     *  git diff new_branch diff_hash -- repository
     *  ```
     *
     *  Except that this function does not create any temporary branches or commits
     */
    std::string calculateDiff(const char* repository, const char* orig_hash, const char* orig_diff, const char* diff_hash);
}
#endif // GITCONFIG_H
