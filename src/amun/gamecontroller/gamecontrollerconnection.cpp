#include "gamecontrollerconnection.h"

GameControllerConnection::GameControllerConnection(InternalGameController *internalGameController, bool isAutoref) :
    m_isAutoref(isAutoref),
    m_externalGameControllerConnection(isAutoref, this)
{
    connect(this, &GameControllerConnection::gotMessageForInternaleGameController, internalGameController, &InternalGameController::handleGameEvent);
    connect(internalGameController, &InternalGameController::gotControllerReply, this, &GameControllerConnection::handleInternalGameControllerReply);
}

GameControllerConnection::GameControllerConnection(bool isAutoref) :
    m_isAutoref(isAutoref),
    m_externalGameControllerConnection(isAutoref, this)
{ }

void GameControllerConnection::handleInternalGameControllerReply(const gameController::ControllerReply &reply)
{
    m_internalGameControllerReplies.push_back(reply);
}

void GameControllerConnection::switchInternalGameController(bool isInternal)
{
    if (isInternal && !m_useInternalGameController) {
        closeConnection();
    }
    m_useInternalGameController = isInternal;
}

void GameControllerConnection::handleRefereeHost(QString host)
{
    m_externalGameControllerConnection.setRefereeHost(host);
}

bool GameControllerConnection::connectGameController()
{
    if (m_isAutoref && m_useInternalGameController) {
        return true;
    } else {
        return m_externalGameControllerConnection.connectGameController();
    }
}

void GameControllerConnection::closeConnection()
{
    m_internalGameControllerReplies.clear();
    m_externalGameControllerConnection.closeConnection();
}

bool GameControllerConnection::receiveGameControllerMessage(google::protobuf::Message *type)
{
    if (m_isAutoref && m_useInternalGameController) {
        if (m_internalGameControllerReplies.size() > 0) {
            type->CopyFrom(m_internalGameControllerReplies.front());
            m_internalGameControllerReplies.pop_front();
            return true;
        }
        return false;
    } else {
        return m_externalGameControllerConnection.receiveGameControllerMessage(type);
    }
}

bool GameControllerConnection::sendGameControllerMessage(const google::protobuf::Message *message, const QString &messageType)
{
    if (m_isAutoref && m_useInternalGameController) {
        // registration messages are not handled by the game controller
        if (messageType == "AutoRefRegistration") {
            gameController::ControllerReply reply;
            reply.set_status_code(gameController::ControllerReply::OK);
            m_internalGameControllerReplies.append(reply);
            return true;
        }
        std::shared_ptr<gameController::AutoRefToController> messageCopy(new gameController::AutoRefToController);
        messageCopy->CopyFrom(*static_cast<const gameController::AutoRefToController*>(message));
        emit gotMessageForInternaleGameController(messageCopy);
        return true;
    } else {
        return m_externalGameControllerConnection.sendGameControllerMessage(message);
    }
}
