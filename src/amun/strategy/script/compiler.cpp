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

#include "compiler.h"

#include <memory>
#include <QThread>

Compiler::Compiler(QObject *parent)
    : QObject(parent)
{
}

CompilerThreadWrapper::CompilerThreadWrapper(std::unique_ptr<Compiler> comp)
    : m_thread(new QThread), m_comp(comp.release())
{
    m_comp->moveToThread(m_thread);
    QObject::connect(m_thread, SIGNAL(started()), m_comp, SLOT(init()));
    QObject::connect(m_thread, SIGNAL(finished()), m_comp, SLOT(deleteLater()));
    m_thread->start();
}

CompilerThreadWrapper::~CompilerThreadWrapper()
{
    m_thread->quit();
    m_thread->wait();
    delete m_thread;
}

Compiler* CompilerThreadWrapper::comp() const
{
    return m_comp;
}
