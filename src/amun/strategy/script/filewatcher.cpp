/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#include "filewatcher.h"
#include <QFileSystemWatcher>
#include <QFileInfo>

FileWatcher::FileWatcher(QObject *parent) :
    QObject(parent)
{
    m_watcher = new QFileSystemWatcher(this);
    connect(m_watcher, &QFileSystemWatcher::fileChanged, this, &FileWatcher::onFileChanged);
    connect(m_watcher, SIGNAL(directoryChanged(QString)), SLOT(handleDirectoryChange(QString)));
}

FileWatcher::~FileWatcher()
{
    delete m_watcher;
}

// return true if file is watched or false if a parent folder is watched
bool FileWatcher::addFile(const QString &filename)
{
    bool isReadable = true;

    // watch fileName or first readable directory when moving upwards
    QString path = filename;
    QString oldPath;
    do {
        QFileInfo info(path);
        if (info.isReadable()) {
            m_watcher->addPath(path);
            break;
        }

        isReadable = false;
        oldPath = path;
        path = info.path();
    } while (path != oldPath);

    if (!isReadable) {
        m_missingFiles.insertMulti(path, filename);
    }

    return isReadable;
}

void FileWatcher::onFileChanged(const QString &name)
{
    if (!m_watcher->files().contains(name))
        addFile(name);
    emit fileChanged(name);
}

void FileWatcher::handleDirectoryChange(const QString &name)
{
    emit directoryChanged(name);

    if (!m_missingFiles.contains(name)) {
        return;
    }

    QList<QString> files = m_missingFiles.values(name);
    m_missingFiles.remove(name);
    foreach (const QString &filename, files) {
        // update watcher to be as close to a file as possible
        if (addFile(filename)) {
            emit fileChanged(filename);
        }
    }
}
