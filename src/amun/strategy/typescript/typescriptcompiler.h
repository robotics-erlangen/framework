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

#ifndef TYPESCRIPTCOMPILER_H
#define TYPESCRIPTCOMPILER_H

#include "strategy/script/compiler.h"
#include "strategy/script/filewatcher.h"

#include <QDir>
#include <QMutex>
#include <QString>
#include <QWaitCondition>
#include <memory>
#include <utility>

class QFileInfo;

class TypescriptCompiler : public Compiler
{
    Q_OBJECT
public:
    TypescriptCompiler(const QFileInfo &tsconfig);

    QFileInfo mapToResult(const QFileInfo& src) override;
    bool requestPause() override;
    void resume() override;
    bool isResultAvailable() override;

public slots:
    void init() override;
    void compile() override;

private slots:
    void indexFiles(const QString &path);

protected:
    enum class CompileResult {
        Success, Warning, Error
    };
    virtual std::pair<CompileResult, QString> performCompilation() = 0;

    QFileInfo m_tsconfig;

private:
    bool isCompilationNeeded();
    // last source and build directory modification
    QPair<QDateTime, QDateTime> lastModifications();
    void doCompile();

    std::unique_ptr<FileWatcher> m_watcher;

    enum class State {
        PAUSED, STANDBY, RENAMING
    };
    State m_state;
    QMutex m_stateLock;
    QWaitCondition m_pauseWait;
};

#endif // TYPESCRIPTCOMPILER_H

