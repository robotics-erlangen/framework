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

#include "strategy/script/strategytype.h"
#include "git/gitconfig.h"
#include "protobuf/status.h"

#include <QObject>
#include <QString>
#include <QDir>
#include <QSet>

enum class GitInfoKind {
	BLUE, YELLOW, AUTOREF, REPLAY_BLUE, REPLAY_YELLOW, RA, CONFIG
};

class GitInfoRecorder : public QObject {
	Q_OBJECT

private:
	QSet<QString> alreadyRecordedDirectories;

signals:
    void sendStatus(const Status &status);

public slots:
	void startGitDiffStrategy(const QDir& dir, bool changed, StrategyType type) {
		GitInfoKind infoKind;
		switch (type) {
			case StrategyType::BLUE:
				infoKind = GitInfoKind::BLUE;
				break;
			case StrategyType::YELLOW:
				infoKind = GitInfoKind::BLUE;
				break;
			case StrategyType::AUTOREF:
				infoKind = GitInfoKind::BLUE;
				break;
		}
		startGitDiff(dir, changed, infoKind);
	}

    void startGitDiff(const QDir& dir, bool changed, GitInfoKind infoKind) {
		QString canonicalPath = dir.canonicalPath();
		if (changed || !alreadyRecordedDirectories.contains(canonicalPath)) {
			alreadyRecordedDirectories.insert(canonicalPath);
			const std::string gitPath = canonicalPath.append("/").toStdString();
			const auto gitTree = gitconfig::getLiveCommit(gitPath.c_str());
			const auto hash = QString::fromStdString(gitTree.hash);
			const auto diff = QString::fromStdString(gitTree.diff);

		}
    }
};
