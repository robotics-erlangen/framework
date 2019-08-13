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
#ifndef COMPILERREGISTRY_H
#define COMPILERREGISTRY_H

#include <functional>
#include <map>
#include <memory>
#include <QDir>
#include <QObject>
#include <QMutex>

class Compiler;
class CompilerThreadWrapper;

using CompilerFactory = std::function<std::unique_ptr<Compiler>(const QDir& baseDir)>;

class CompilerRegistry : public QObject
{
    Q_OBJECT
public:
    std::shared_ptr<CompilerThreadWrapper> getCompiler(const QDir& baseDir, const CompilerFactory& factory);
private:
    struct CompareQDir {
        bool operator()(const QDir& lhs, const QDir& rhs) const;
    };
    std::map<QDir, std::weak_ptr<CompilerThreadWrapper>, CompareQDir> m_registry;

    // This class is designed to be shared across multiple strategy threads
    QMutex m_registryMutex;
};

#endif

