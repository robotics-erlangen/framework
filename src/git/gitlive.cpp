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
#include "git2/errors.h"


#include <iostream>
#include <memory>

#include <cassert>
#include <cstring>

#include <vector>

#include <QMutexLocker>

#define GIT_RAII(pointer, cleanup) std::unique_ptr<std::remove_reference<decltype(*pointer)>::type, void(*)(decltype(pointer))> raii_##pointer{pointer, cleanup}


struct Git_tree_raii {

    Git_tree_raii() = default;
    ~Git_tree_raii() {
        for(char* e : subpaths) {
            delete[] e;
        }
        if (tree) {
            git_tree_free(tree);
        }
        if (commit) {
            git_commit_free(commit);
        }
        if (repo) {
            git_repository_free(repo);
        }
    }
    Git_tree_raii(const Git_tree_raii&) = delete;
    Git_tree_raii& operator=(const Git_tree_raii&) = delete;

    std::string errorMsg;
    git_repository* repo = nullptr;
    git_oid oid;
    git_commit* commit = nullptr;
    git_tree* tree = nullptr;
    std::vector<char*> subpaths;
};

QMutex mutex{QMutex::Recursive};

/* Populates Git_tree_raii with repo and oid,
 * assummes mutex to be locked and libgit running */
static void populate_oid(Git_tree_raii& in, const char* path, const char* tree_ish) {
    int exitcode;

    exitcode = git_repository_open_ext(&in.repo, path, 0, NULL);
    if (exitcode) {
        in.repo = nullptr;
        in.errorMsg = "error in git_repository_open_ext " + std::to_string(exitcode);
        return;
    }

    exitcode = git_reference_name_to_id(&in.oid, in.repo, tree_ish);
    if (exitcode) {
        in.errorMsg = "error in git_reference_name_to_id " + std::to_string(exitcode);
        return;
    }
}

static void populate_tree(Git_tree_raii& in, const char* path, const char* tree_ish) {
    int exitcode;

    populate_oid(in, path, tree_ish);
    if (in.errorMsg.size() != 0) {
        return;
    }
    exitcode = git_commit_lookup(&in.commit, in.repo, &in.oid);
    if (exitcode) {
        in.commit = nullptr;
        in.errorMsg = "error in git_commit_lookup" + std::to_string(exitcode);
        return;
    }

    exitcode = git_commit_tree(&in.tree, in.commit);
    if (exitcode) {
        in.tree = nullptr;
        in.errorMsg = "error in git_commit_tree" + std::to_string(exitcode);
        return;
    }
}

static std::string getLiveCommitHash(const char* path, const char* tree_ish) {
    QMutexLocker lock{&mutex};
    git_libgit2_init();
    std::unique_ptr<void, void(*)(void*)> raii_libgit2{nullptr, [](void* ptr) {git_libgit2_shutdown();}};

    Git_tree_raii data;
    populate_oid(data, path, tree_ish);
    if (data.errorMsg.size() != 0) {
        return data.errorMsg;
    }

    std::string out;
    out.resize(GIT_OID_HEXSZ+1);
    assert(out.size() >= GIT_OID_HEXSZ + 1);

    git_oid_tostr(out.data(), out.size(), &data.oid);

    return out;
}

std::string gitconfig::getLiveCommitHash(const char* path) {
    return ::getLiveCommitHash(path, "HEAD");
}

struct HunkDiff {
    char* hunk_header = nullptr;
    size_t hunk_header_len = 0;
    std::string text;

    ~HunkDiff() {
        free(hunk_header);
    }

    explicit HunkDiff(const char* line, size_t len) {
        hunk_header = static_cast<char*>(malloc(sizeof(char) * len));
        strncpy(hunk_header, line, len);
        hunk_header_len = len;
    }

    HunkDiff(const HunkDiff&) = delete;
    HunkDiff(HunkDiff&& other) : text(std::move(other.text)) {
        this->hunk_header = other.hunk_header;
        this->hunk_header_len = other.hunk_header_len;
        other.hunk_header = nullptr;
        other.hunk_header_len = 0;
    }
    HunkDiff& operator=(const HunkDiff&) = delete;
};

struct FileDiff {
    char* file_header = nullptr;
    size_t file_header_len = 0;
    std::vector<HunkDiff> hunks;
    std::string errorMsgs;

    ~FileDiff() {
        free(file_header);
    }

    explicit FileDiff(const char* line, size_t len) {
        file_header = static_cast<char*>(malloc(sizeof(char) * len));
        strncpy(file_header, line, len);
        file_header_len = len;
    }

    FileDiff(const FileDiff&) = delete;
    FileDiff(FileDiff&& other) : hunks(std::move(other.hunks)), errorMsgs(std::move(other.errorMsgs)) {
        this->file_header = other.file_header;
        this->file_header_len = other.file_header_len;
        other.file_header = nullptr;
        other.file_header_len = 0;
    }
    FileDiff& operator=(const FileDiff&) = delete;
};

static int print_to_vector_file_diff(const git_diff_delta *, const git_diff_hunk *, const git_diff_line *l, void* payload) {
    std::vector<FileDiff>* out = static_cast<std::vector<FileDiff>*>(payload);
    switch(l->origin) {
        case GIT_DIFF_LINE_FILE_HDR:
            out->emplace_back(l->content, l->content_len);
            break;
        case GIT_DIFF_LINE_HUNK_HDR:
            out->back().hunks.emplace_back(l->content, l->content_len);
            break;
        case GIT_DIFF_LINE_CONTEXT:
        case GIT_DIFF_LINE_ADDITION:
        case GIT_DIFF_LINE_DELETION:
            out->back().hunks.back().text.push_back(l->origin);
            out->back().hunks.back().text.append(l->content, l->content_len);
            break;
        default:
            out->back().errorMsgs.append("Error in ");
            out->back().errorMsgs.append(__func__);
            out->back().errorMsgs.append(" : unknown l->origin: ");
            out->back().errorMsgs.push_back(l->origin);
            out->back().errorMsgs.push_back('\n');
            out->back().errorMsgs.append(l->content, l->content_len);
            break;
    }
    return 0;
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

static char* copy_string(const char* in) {
    std::size_t len = strlen(in) + 1;
    char* out = new char[len];
    std::strcpy(out, in);
    return out;
}

static std::string convert_file_diffs_to_string(std::vector<FileDiff>&& data) {
    std::string out;
    std::string errors;
    for(auto it = data.begin(); it != data.end(); ++it) {
        if (it->errorMsgs.size() != 0) {
            errors += it->errorMsgs;
        }
        if (it->hunks.size() == 0) continue;
        out.append(it->file_header, it->file_header_len);
        for(auto hit = it->hunks.begin(); hit != it->hunks.end(); ++hit) {
            out.append(hit->hunk_header, hit->hunk_header_len);
            out += std::move(hit->text);
        }
    }
    return out;
}

std::string gitconfig::getLiveCommitDiff(const char* path) {
    int exitcode;

    QMutexLocker lock{&mutex};
    git_libgit2_init();
    std::unique_ptr<void, void(*)(void*)> raii_libgit2{nullptr, [](void* ptr) {git_libgit2_shutdown();}};

    Git_tree_raii data;
    populate_tree(data, path, "HEAD");
    if (data.errorMsg.size() != 0) {
        return data.errorMsg;
    }
    const char* workdir = git_repository_workdir(data.repo);
    const char* relpath = path + std::strlen(workdir);

    std::cout << "Workdir: " << workdir << ", relpath: " << relpath << std::endl;


    data.subpaths.push_back(copy_string(relpath));


    git_diff_options o = {
        .version = GIT_DIFF_OPTIONS_VERSION,
        .flags = GIT_DIFF_IGNORE_WHITESPACE_EOL,
        .ignore_submodules = GIT_SUBMODULE_IGNORE_NONE,
        .pathspec = {.strings= data.subpaths.data(), .count = data.subpaths.size()}
    };
    git_diff* diff;
    exitcode = git_diff_tree_to_workdir(&diff, data.repo, data.tree, &o);
    if (exitcode) {
        return "error in git_diff_tree_to_workdir" + std::to_string(exitcode);
    }
    GIT_RAII(diff, git_diff_free);

    std::string out;

    std::vector<FileDiff> otherout;

    exitcode = git_diff_print(diff, GIT_DIFF_FORMAT_PATCH, print_to_std_string, &out);
    if (exitcode) {
        return "error in git_diff_print" + std::to_string(exitcode);
    }

    exitcode = git_diff_print(diff, GIT_DIFF_FORMAT_PATCH, print_to_vector_file_diff, &otherout);
    if (exitcode) {
        return "error in git_diff_print" + std::to_string(exitcode);
    }

    std::string newout = convert_file_diffs_to_string(std::move(otherout));

    if (newout != out) {
        return "error: Linux based difference where we should not expect any";
    }

    return newout;


//    return out;
}
