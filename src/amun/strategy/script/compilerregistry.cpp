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

#include "compilerregistry.h"

#include "compiler.h"
#include <memory>
#include <utility>
#include <QDir>
#include <QMutex>
#include <QMutexLocker>

std::shared_ptr<CompilerThreadWrapper> CompilerRegistry::getCompiler(const QDir& baseDir, const CompilerFactory& factory)
{
    QMutexLocker locker(&m_registryMutex);

    auto cachedPair = m_registry.find(baseDir);
    bool contained = cachedPair != m_registry.end();

    std::shared_ptr<CompilerThreadWrapper> compiler;
    if (contained && !cachedPair->second.expired()) {
        compiler = cachedPair->second.lock();
    } else {
        compiler = std::make_shared<CompilerThreadWrapper>(factory(baseDir));
    }

    auto weakRef = std::weak_ptr<CompilerThreadWrapper>(compiler);

    if (contained) {
        m_registry[baseDir] = weakRef;
    } else {
        m_registry.emplace(std::make_pair(baseDir, weakRef));
    }

    return compiler;
}

bool CompilerRegistry::CompareQDir::operator()(const QDir& lhs, const QDir& rhs) const
{
    return lhs.absolutePath() < rhs.absolutePath();
}
