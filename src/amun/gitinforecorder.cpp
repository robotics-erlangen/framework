/***************************************************************************
 *   Copyright 2022 Michel Schmid
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

#include "gitinforecorder.h"
#include "git/gitconfig.h"

void GitInfoRecorder::startGitDiffStrategy(const QString& dir, bool changed, int type) {
    amun::GitInfo::Kind infoKind;
    switch (static_cast<StrategyType>(type)) {
        case StrategyType::BLUE:
            infoKind = amun::GitInfo_Kind_BLUE;
            break;
        case StrategyType::YELLOW:
            infoKind = amun::GitInfo_Kind_YELLOW;
            break;
        case StrategyType::AUTOREF:
            infoKind = amun::GitInfo_Kind_AUTOREF;
            break;
    }
    startGitDiff(dir, changed, infoKind);
}

void GitInfoRecorder::startGitDiff(QString canonicalPath, bool changed, amun::GitInfo::Kind infoKind) {
    if (changed || !(alreadyRecordedDirectories.contains(canonicalPath)
                && alreadyRecordedDirectories[canonicalPath].contains(static_cast<int>(infoKind)))) {
        alreadyRecordedDirectories[canonicalPath].insert(static_cast<int>(infoKind));
        const std::string gitPath = canonicalPath.append("/").toStdString();
        const auto gitTree = gitconfig::getLiveCommit(gitPath.c_str());
        const auto hash = QString::fromStdString(gitTree.hash);
        const auto diff = QString::fromStdString(gitTree.diff);

        Status status(new amun::Status);
        auto gitInfo = status->add_git_info();
        gitInfo->set_kind(infoKind);
        *gitInfo->mutable_hash() = gitTree.hash;
        *gitInfo->mutable_diff() = gitTree.diff;
        *gitInfo->mutable_min_hash() = gitTree.min_hash;
        *gitInfo->mutable_error() = gitTree.error;
        sendStatus(status);
    }
}

void GitInfoRecorder::recordRaGitDiff() {
    Status status(new amun::Status);
    auto gitInfo = status->add_git_info();
    gitInfo->set_kind(amun::GitInfo_Kind_RA);
    *gitInfo->mutable_hash() = gitconfig::getErforceReliableCommitHash();
    *gitInfo->mutable_diff() = gitconfig::getErforceReliableCommitDiff();
    *gitInfo->mutable_min_hash() = gitconfig::getErforceCommitHash();
    *gitInfo->mutable_error() = "";
    sendStatus(status);
}
