/***************************************************************************
 *   Copyright 2019 Paul Bergmann                                          *
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

#include "strategysearch.h"

#include <QDir>
#include <QFileInfo>
#include <QFileInfoList>
#include <QString>
#include <QStringList>

QStringList ra::sanitizeRecentScripts(const QStringList &oldRecent, const QStringList &initFileNames)
{
	QStringList recentScripts;
	for (const QString& script : oldRecent) {
		QFileInfo file { script };
		if (file.exists() && initFileNames.contains(file.fileName()))
			recentScripts.append(script);
	}
	return recentScripts;
}

void ra::searchForStrategies(QStringList &oldRecent, const QString &baseDir, const QString &initFileName)
{
	QDir strategyFolder { baseDir };
	if (!strategyFolder.exists())
		return;;

	QFileInfoList infoList = strategyFolder.entryInfoList(QDir::Dirs | QDir::NoDotAndDotDot);
	for (const QFileInfo &dirfile : infoList) {
		QDir dir { dirfile.absoluteFilePath() };
		QString entrypoint = dir.absoluteFilePath(initFileName);
		QFileInfo file { entrypoint };
		if (!file.exists())
			continue;

		QString scriptPath = file.absoluteFilePath();
		if (!oldRecent.contains(scriptPath))
			oldRecent.append(scriptPath);
	}
}

