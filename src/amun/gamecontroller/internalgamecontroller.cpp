#include "internalgamecontroller.h"
#include <google/protobuf/descriptor.h>

InternalGameController::InternalGameController(const Timer *timer) :
    m_timer(timer)
{ }

void InternalGameController::handleGuiCommand(const QByteArray &data)
{
    emit gotPacketForReferee(data);
}

void InternalGameController::handleStatus(const Status& status)
{
    if (status->has_geometry()) {
        m_geometry = status->geometry();
    }
}

void InternalGameController::handleCommand(const amun::CommandReferee &refereeCommand)
{
    if (refereeCommand.has_command()) {
        const std::string &c = refereeCommand.command();
        handleGuiCommand(QByteArray(c.data(), c.size()));
    }
}
