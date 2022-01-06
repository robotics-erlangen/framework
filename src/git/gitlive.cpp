/***************************************************************************
 *   Copyright 2022 Tobias Heineken                                        *
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

#include "gitconfig.h"

#include "git2/global.h"
#include "git2/repository.h"
#include "git2/refs.h"
#include "git2/tree.h"
#include "git2/commit.h"
#include "git2/diff.h"
#include "git2/buffer.h"

#include <iostream>
#include <memory>

#include <cassert>

#define GIT_RAII(pointer, cleanup) std::unique_ptr<std::remove_reference<decltype(*pointer)>::type, void(*)(decltype(pointer))> raii_##pointer{pointer, cleanup}


std::string gitconfig::getLiveCommitHash(const char* path) {
    int exitcode;
    git_libgit2_init();
    std::unique_ptr<void, void(*)(void*)> raii_libgit2{nullptr, [](void* ptr) {git_libgit2_shutdown();}};
    git_repository* repo;
    exitcode = git_repository_open_ext(&repo, path, 0, NULL);
    if (exitcode) {
        return "error in git_repository_open_ext" + std::to_string(exitcode);
    }
    GIT_RAII(repo, git_repository_free);

    git_oid head_oid;
    exitcode = git_reference_name_to_id(&head_oid, repo, "HEAD");
    if (exitcode) {
        return "error in git_reference_name_to_id" + std::to_string(exitcode);
    }
    std::string out;
    out.resize(GIT_OID_HEXSZ+1);
    assert(out.size() >= GIT_OID_HEXSZ + 1);

    git_oid_tostr(out.data(), out.size(), &head_oid);

    return out;
}

static int print_to_std_string(const git_diff_delta *, const git_diff_hunk *, const git_diff_line *l, void* payload) {
    std::string* out = static_cast<std::string*>(payload);

    if (l->origin == GIT_DIFF_LINE_CONTEXT ||
        l->origin == GIT_DIFF_LINE_ADDITION ||
        l->origin == GIT_DIFF_LINE_DELETION)
        out->push_back(l->origin);

    out->append(l->content, l->content_len);
    return 0;
}

std::string gitconfig::getLiveCommitDiff(const char* path) {
    int exitcode;
    git_libgit2_init();
    std::unique_ptr<void, void(*)(void*)> raii_libgit2{nullptr, [](void* ptr) {git_libgit2_shutdown();}};

    git_repository* repo;
    exitcode = git_repository_open_ext(&repo, path, 0, NULL);
    if (exitcode) {
        return "error in git_repository_open_ext" + std::to_string(exitcode);
    }
    GIT_RAII(repo, git_repository_free);

    git_oid head_oid;
    exitcode = git_reference_name_to_id(&head_oid, repo, "HEAD");
    if (exitcode) {
        return "error in git_reference_name_to_id" + std::to_string(exitcode);
    }

    git_commit *head;
    exitcode = git_commit_lookup(&head, repo, &head_oid);
    if (exitcode) {
        return "error in git_commit_lookup" + std::to_string(exitcode);
    }
    GIT_RAII(head, git_commit_free);


    git_tree* tree;
    exitcode = git_commit_tree(&tree, head);
    if (exitcode) {
        return "error in git_commit_tree" + std::to_string(exitcode);
    }
    GIT_RAII(tree, git_tree_free);

    git_diff* diff;
    exitcode = git_diff_tree_to_workdir(&diff, repo, tree, NULL);
    if (exitcode) {
        return "error in git_diff_tree_to_workdir" + std::to_string(exitcode);
    }
    GIT_RAII(diff, git_diff_free);

    std::string out;

    exitcode = git_diff_print(diff, GIT_DIFF_FORMAT_PATCH, print_to_std_string, &out);
    if (exitcode) {
        return "error in git_diff_print" + std::to_string(exitcode);
    }


    return out;
}
