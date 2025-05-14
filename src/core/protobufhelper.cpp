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

#include "protobufhelper.h"

#include <QByteArray>
#include <QtGlobal>
#include <google/protobuf/message_lite.h>
#include <limits>

QByteArray protobufhelper::bufferWithSpaceFor(const google::protobuf::MessageLite &message)
{
    const auto size = message.ByteSizeLong();
    using resize_argument_type = qsizetype;

    if (size > std::numeric_limits<resize_argument_type>::max()) {
        qFatal("Message is too large to fit into a QByteArray");
    }

    QByteArray buffer;
    buffer.resize(static_cast<resize_argument_type>(size));

    return buffer;
}
