/***************************************************************************
 *   Copyright 2018 Andreas Wendler, Paul Bergmann                         *
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

#include "typescriptcompiler.h"

#include "strategy/script/filewatcher.h"

#include <QDateTime>
#include <QDirIterator>
#include <QFileInfo>
#include <QString>
#include <QtGlobal>
#include <utility>

TypescriptCompiler::TypescriptCompiler(const QFileInfo &tsconfig)
    : m_tsconfig(tsconfig), m_watcher(this), m_state(State::STANDBY)
{
    Q_ASSERT(m_tsconfig.isFile());

    int baseDirLength = m_tsconfig.dir().absolutePath().length();
    QDirIterator it(m_tsconfig.dir().absolutePath(), QDir::Files | QDir::NoDotAndDotDot, QDirIterator::Subdirectories);
    while (it.hasNext()) {
        it.next();
        if (it.filePath().mid(baseDirLength).startsWith("/built"))
            continue;
        m_watcher.addFile(it.filePath());
    }

    connect(&m_watcher, &FileWatcher::fileChanged, this, &TypescriptCompiler::compile);
}

QFileInfo TypescriptCompiler::mapToResult(const QFileInfo& src) {
    QString sourceBaseDir = m_tsconfig.dir().absolutePath();
    Q_ASSERT(src.absoluteFilePath().startsWith(sourceBaseDir));

    QString subdir = src.dir().absolutePath().mid(sourceBaseDir.length());
    QString basename = src.completeBaseName();

    QFileInfo result(sourceBaseDir + "/built" + subdir + "/" + basename + ".js");
    return result;
}

bool TypescriptCompiler::requestPause()
{
    QMutexLocker locker(&m_stateLock);
    bool pausable = m_state != State::RENAMING;
    if (pausable) {
        m_state = State::PAUSED;
    }
    return pausable;
}

void TypescriptCompiler::resume()
{
    QMutexLocker locker(&m_stateLock);
    if (m_state == State::PAUSED) {
        m_state = State::STANDBY;
        m_pauseWait.wakeAll();
    }
}

bool TypescriptCompiler::isResultAvailable()
{
    QMutexLocker locker(&m_stateLock);
    QFileInfo outputDir(m_tsconfig.dir().filePath("built/"));
    return m_state != State::RENAMING && outputDir.exists() && outputDir.isDir();
}

void TypescriptCompiler::compile()
{
    if (!isCompilationNeeded()) {
        return;
    }

    QDir newResult(m_tsconfig.dir().absoluteFilePath("built-tmp"));
    // ra may has exited before renaming the tmp folder
    if (QFileInfo(newResult.absolutePath()).exists()) {
        newResult.removeRecursively();
    }

    emit started();
    std::pair<CompileResult, QString> result = performCompilation();

    QMutexLocker locker(&m_stateLock);
    while (m_state == State::PAUSED)
        m_pauseWait.wait(locker.mutex());
    m_state = State::RENAMING;
    locker.unlock();

    bool renameSucceeded = false;
    QDir oldResult(m_tsconfig.dir().absoluteFilePath("built"));
    if (!oldResult.removeRecursively()) {
        emit error("Could not remove old compile result");
    } else if (!newResult.rename(newResult.absolutePath(), oldResult.absolutePath())) {
        emit error("Could not rename new compile result");
    } else {
        renameSucceeded = true;
    }

    locker.relock();
    m_state = State::STANDBY;
    locker.unlock();

    if (!renameSucceeded) return;

    switch (result.first) {
    case CompileResult::Success:
        emit success();
        break;
    case CompileResult::Warning:
        emit warning(result.second);
        break;
    case CompileResult::Error:
        emit error(result.second);
        break;
    }
}

static QDateTime getLastModified(const QDir& dir)
{
    QDirIterator it(dir.absolutePath(), QDir::Files | QDir::Dirs | QDir::NoDotAndDotDot, QDirIterator::Subdirectories);
    QDateTime lastModified;
    while (it.hasNext()) {
        it.next();
        QDateTime modified = it.fileInfo().lastModified();
        if (lastModified.isNull() || modified > lastModified) {
            lastModified = modified;
        }
    }
    return lastModified;
}

bool TypescriptCompiler::isCompilationNeeded()
{
    QFileInfo buildDir(m_tsconfig.dir().absolutePath() + "/built");
    if (!buildDir.exists()) {
        return true;
    }

    QDateTime lastModifiedSource, lastModifiedResult;

    QDirIterator it(m_tsconfig.dir().absolutePath(), QDir::Files | QDir::Dirs | QDir::NoDotAndDotDot);
    while (it.hasNext()) {
        it.next();
        QFileInfo info = it.fileInfo();
        if (info.fileName() == "built") {
            lastModifiedResult = getLastModified(QDir(info.absoluteFilePath()));
            continue;
        }

        QDateTime modified = info.isDir()
            ? getLastModified(QDir(info.absoluteFilePath()))
            : info.lastModified();
        if (lastModifiedSource.isNull() || modified > lastModifiedSource) {
            lastModifiedSource = modified;
        }
    }

    return lastModifiedResult.isNull() || lastModifiedSource > lastModifiedResult;
}

