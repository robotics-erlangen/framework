/***************************************************************************
 *   Copyright 2025 Paul Bergmann                                          *
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

#pragma once

#include <memory>
#include <v8.h>

/*! \brief RAII-wrapper around an v8::Isolate
 *
 * Also enters/exits the isolate in its constructor/destructor
 */
class IsolateHolder
{
public:
    /*! \brief Initialize and enter the isolate */
    explicit IsolateHolder();
    /*! \brief Exit and dispose the isolate */
    ~IsolateHolder();

    /*! \brief Get a non-owning pointer to the isolate */
    v8::Isolate* get() const { return m_isolate; }
private:
    // The isolate does not take ownership of the allocator.
    // Hence it needs to be stored and deleted manually.
    // Especially typescript.cpp needs the allocator while the isolate is in
    // use to allow external debuggers to connect. If it were deleted earlier,
    // this would rise a use-after-free.
    // It is uncertain, apart from the above, if the isolate actually needs the
    // allocator after initialization.
    std::unique_ptr<v8::ArrayBuffer::Allocator> m_arrayAllocator;
    v8::Isolate* m_isolate = nullptr;
};
