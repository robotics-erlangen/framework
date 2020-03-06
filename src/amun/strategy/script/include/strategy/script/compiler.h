/***************************************************************************
 *   Copyright 2018 Paul Bergmann                                          *
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
#ifndef COMPILER_H
#define COMPILER_H

#include <functional>
#include <memory>
#include <QObject>

class QFileInfo;
class QString;
class QThread;

class Compiler : public QObject
{
    Q_OBJECT
public:
    Compiler(QObject *parent = nullptr);
    virtual ~Compiler() = default;

    virtual QFileInfo mapToResult(const QFileInfo& src) = 0;
    virtual bool requestPause() = 0;
    virtual void resume() = 0;
    virtual bool isResultAvailable() = 0;
public slots:
    virtual void init() = 0;
    virtual void compile() = 0;
signals:
    void started();
    void success();
    void error(const QString &message);
    void warning(const QString &message);
};

class CompilerThreadWrapper
{
public:
    CompilerThreadWrapper(std::unique_ptr<Compiler> comp);
    virtual ~CompilerThreadWrapper();

    CompilerThreadWrapper(const CompilerThreadWrapper& other) = delete;
    CompilerThreadWrapper& operator=(const CompilerThreadWrapper& other) = delete;

    Compiler* comp() const;
private:
    /*
     * We use raw pointers here since smart pointers would need custom deleters anyway
     * which can also be implemented using this class's destructor.
     */
    QThread* m_thread;
    Compiler* m_comp;
};

#endif
