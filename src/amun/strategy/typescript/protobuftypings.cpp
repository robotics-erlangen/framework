/***************************************************************************
 *   Copyright 2021 Paul Bergmann                                          *
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

#include "protobuftypings.h"

#include <QDateTime>
#include <QFileInfo>
#include <QLocale>
#include <deque>
#include <google/protobuf/descriptor.h>
#include <iterator>
#include <ostream>
#include <sstream>
#include <stack>
#include <string>
#include <unordered_set>
#include <utility>

#include "protobuf/command.pb.h"
#include "protobuf/debug.pb.h"
#include "protobuf/gamestate.pb.h"
#include "protobuf/robot.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"
#include "protobuf/ssl_game_controller_team.pb.h"
#include "protobuf/ssl_mixed_team.pb.h"
#include "protobuf/ssl_referee.pb.h"
#include "protobuf/userinput.pb.h"
#include "protobuf/world.pb.h"

using google::protobuf::Descriptor;
using google::protobuf::EnumDescriptor;
using google::protobuf::EnumValueDescriptor;
using google::protobuf::FieldDescriptor;
using google::protobuf::FileDescriptor;

namespace {
/* __DATE__ is of format mmm dd yyyy, but for days 1-9 the day is padded
 * with a space. QT only supports
 * - Single digit for 1-9
 * - Leading zero
 * We thus need to filter it out
 */
const QDateTime COMPILATION_DATETIME {
    QLocale::c().toDate(QString(__DATE__).replace("  ", " "), "MMM d yyyy"),
    QLocale::c().toTime(__TIME__, "HH:mm:ss")
};

/* Messages that are transferred between the strategy and amun. Used
 * sub-messages and enums will be found as well
 */
const Descriptor* EXPOSED_MESSAGES[] {
    SSL_Referee::descriptor(),
    amun::Command::descriptor(),
    amun::GameState::descriptor(),
    amun::UserInput::descriptor(),
    amun::Visualization::descriptor(),
    gameController::AutoRefRegistration::descriptor(),
    gameController::AutoRefToController::descriptor(),
    gameController::ControllerToAutoRef::descriptor(),
    gameController::ControllerToTeam::descriptor(),
    gameController::TeamRegistration::descriptor(),
    gameController::TeamToController::descriptor(),
    robot::Command::descriptor(),
    robot::Spline::descriptor(),
    robot::Team::descriptor(),
    ssl::TeamPlan::descriptor(),
    world::Geometry::descriptor(),
    world::State::descriptor(),
};

struct UsedTypes {
    std::unordered_set<const Descriptor*> messages;
    /* Enums used in messages can be defined both inside the message and on top
     * level. We thus need to gather all enums used in message, not just the
     * ones defined inline.
     *
     * It is easiest to separate them early since the same enum may be used in
     * multiple messages
     */
    std::unordered_set<const EnumDescriptor*> enums;
};

UsedTypes allUsedTypes() {
    std::stack<const Descriptor*> unvisited {
        std::deque<const Descriptor*> { std::begin(EXPOSED_MESSAGES), std::end(EXPOSED_MESSAGES) }
    };

    std::unordered_set<const Descriptor*> messages;
    std::unordered_set<const EnumDescriptor*> enums;

    while (!unvisited.empty()) {
        const Descriptor* desc = unvisited.top();
        unvisited.pop();

        messages.emplace(desc);

        for (int i = 0; i < desc->field_count(); ++i) {
            const FieldDescriptor* field = desc->field(i);
            switch (field->type()) {
                case FieldDescriptor::TYPE_MESSAGE:
                    unvisited.emplace(field->message_type());
                    break;
                case FieldDescriptor::TYPE_ENUM:
                    enums.emplace(field->enum_type());
                    break;
                default:
                    break;
            }
        }
    }

    return { messages, enums };
}

int printNamespace(std::ostream& os, const std::string& package) {
    auto printName = [&os, &package](std::size_t first) {
        std::size_t curr = first;
        for (; curr < package.length(); ++curr) {
            if (package[curr] == '.') {
                return curr + 1;
            }
            os << package[curr];
        }
        return curr;
    };

    int depth = 0;
    std::size_t i = 0;
    while (i < package.length()) {
        depth++;
        os << "export namespace ";
        i = printName(i);
        os << "{";
    }

    return depth;
}

std::ostream& printNamespaceEnd(std::ostream& os, int depth) {
    while (depth--) {
        os << "}";
    }
    os << std::endl;
    return os;
}

std::ostream& printEnum(std::ostream& os, const EnumDescriptor* desc) {
    const std::string& enclosing_name = desc->containing_type()
        ? desc->containing_type()->full_name() : desc->file()->package();
    int depth = printNamespace(os, enclosing_name);

    depth++;
    os << "export enum " << desc->name() << "{" << std::endl;

    for (int i = 0; i < desc->value_count(); ++i) {
        const EnumValueDescriptor* value = desc->value(i);
        os << '\t' << value->name() << " = \"" << value->name() << "\"," << std::endl;
    }

    printNamespaceEnd(os, depth);
    return os;
}

std::ostream& printField(std::ostream& os, const FieldDescriptor* field) {
    os << '\t' << field->name();
    if (field->is_optional() || field->is_repeated()) {
        os << "?";
    }
    os << ": ";

    if (field->type() == google::protobuf::FieldDescriptor::Type::TYPE_BYTES) {
        os <<"Uint8Array";
    } else {
        switch (field->cpp_type()) {
            case FieldDescriptor::CPPTYPE_INT32:
            case FieldDescriptor::CPPTYPE_INT64:
            case FieldDescriptor::CPPTYPE_UINT32:
            case FieldDescriptor::CPPTYPE_UINT64:
            case FieldDescriptor::CPPTYPE_DOUBLE:
            case FieldDescriptor::CPPTYPE_FLOAT:
                os << "number";
                break;
            case FieldDescriptor::CPPTYPE_BOOL:
                os << "boolean";
                break;
            case FieldDescriptor::CPPTYPE_STRING:
                os << "string";
                break;
            case FieldDescriptor::CPPTYPE_MESSAGE:
                os << field->message_type()->full_name();
                break;
            case FieldDescriptor::CPPTYPE_ENUM:
                os << field->enum_type()->full_name();
                break;
        }
    }

    if (field->is_repeated()) {
        os << "[]";
    }
    os << ";" << std::endl;
    return os;
}

std::ostream& printMessage(std::ostream& os, const Descriptor* desc) {
    const std::string& enclosing_name = desc->containing_type()
        ? desc->containing_type()->full_name() : desc->file()->package();
    int depth = printNamespace(os, enclosing_name);

    depth++;
    os << "export interface " << desc->name() << "{" << std::endl;

    for (int i = 0; i < desc->field_count(); ++i) {
        printField(os, desc->field(i));
    }

    printNamespaceEnd(os, depth);
    return os;
}
}

std::ostream& generateProtobufTypings(std::ostream& os) {
    auto usedTypes = allUsedTypes();

    for (auto desc : usedTypes.enums) {
        printEnum(os, desc);
    }
    for (auto desc : usedTypes.messages) {
        printMessage(os, desc);
    }

    return os;
}

bool shouldGenerateProtobufTypings(const QFileInfo& baseProto) {
    return !baseProto.exists() || baseProto.lastModified() <= COMPILATION_DATETIME;
}
