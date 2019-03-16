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

#include "buffer.h"

#include "buffer/buffer.h"

#include <memory>
#include <QList>
#include "v8.h"

using v8::HandleScope;
using v8::Isolate;
using v8::ObjectTemplate;

Node::buffer::buffer(Isolate* isolate) : Node::ObjectContainer(isolate) {
    HandleScope handleScope(m_isolate);

    auto objectTemplate = createTemplateWithCallbacks<ObjectTemplate>({});
    setHandle(objectTemplate->NewInstance(m_isolate->GetCurrentContext()).ToLocalChecked());

    put("Buffer", std::unique_ptr<Node::ObjectContainer>(new Buffer(m_isolate)));
}
