/***************************************************************************
 *   Copyright 2025 Andreas Wendler, Tobias Heineken, Paul Bergmann        *
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

#include "typescriptsource.h"

#include <QByteArray>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QList>
#include <QString>
#include <SourceMap/Extension/Interpolation.h>
#include <SourceMap/RevisionThree.h>

std::optional<QDir> getTsconfigDir(const QString &filename)
{
    QDir baseDir = QFileInfo(filename).absoluteDir();
    while (true) {
        if (QFileInfo(baseDir, "tsconfig.json").exists())
            break;
        if (!baseDir.cdUp())
            return std::nullopt;
    }

    return { baseDir };
}

QString resolveJsToTs(QString fileQString, uint32_t lineUint, uint32_t columnUint)
{
    QFile jsfile(fileQString);
    QString tsSourcemapQString;
    QFileInfo jsInfo(jsfile);
    QDir absJSDir = jsInfo.absoluteDir();
    if (jsfile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QList<QByteArray> jsLineList = QByteArray(jsfile.readAll()).split('\n');
#if QT_VERSION >= QT_VERSION_CHECK(5,6,0)
        for (auto revIt = jsLineList.rbegin(); revIt != jsLineList.rend(); ++revIt) {
#else
        for (auto revIt = jsLineList.begin(); revIt != jsLineList.end(); ++revIt) {
#endif
            QString line = QString::fromUtf8(*revIt);
            if (line.startsWith("//# ")) {
                QStringList entries = line.right(line.size()-4).split("=");
                if (entries[0] == "sourceMappingURL") {
                    tsSourcemapQString = absJSDir.canonicalPath() + "/" + entries[1];
                    break;
                }
            }
        }
    }
    if (!tsSourcemapQString.isEmpty()) {
        QFile tsSourcemap(tsSourcemapQString);
        if (tsSourcemap.open(QIODevice::ReadOnly | QIODevice::Text)) {
            QByteArray arr(tsSourcemap.readAll());
            SourceMap::RevisionThree sourceMap = SourceMap::RevisionThree::fromJson(arr);
            const QStringList sources = sourceMap.sources();
            QString tsFileName = absJSDir.canonicalPath() + "/" + sources.first(); // assume that there is only one sourceFile for any js file
            SourceMap::Position jsPos(lineUint, columnUint);
            auto decodedMapping = sourceMap.decodedMappings<SourceMap::Data<SourceMap::Extension::Interpolation>>();
            SourceMap::Mapping<SourceMap::Extension::Interpolation> mapping(decodedMapping);
            const SourceMap::Entry<SourceMap::Extension::Interpolation>* entry(mapping.findEntryByGenerated(jsPos));
            if (entry) {
                fileQString = QFileInfo(tsFileName).absoluteFilePath();
                lineUint = entry->original.line;
                columnUint = entry->original.column;
            }
        }
    }
    auto basePath = getTsconfigDir(fileQString);
    if (basePath) {
        fileQString = fileQString.replace(basePath->absolutePath() + "/", "");
    }

    return fileQString + ":" + QString::number(lineUint) + ":" + QString::number(columnUint);
}
