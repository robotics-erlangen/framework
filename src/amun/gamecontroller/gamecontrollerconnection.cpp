#include "gamecontrollerconnection.h"

GameControllerConnection::GameControllerConnection(bool isAutoref) :
    m_externalGameControllerConnection(isAutoref, this)
{

}

void GameControllerConnection::handleRefereeHost(QString host)
{
    m_externalGameControllerConnection.setRefereeHost(host);
}

bool GameControllerConnection::connectGameController()
{
    return m_externalGameControllerConnection.connectGameController();
}

void GameControllerConnection::closeConnection()
{
    m_externalGameControllerConnection.closeConnection();
}

bool GameControllerConnection::receiveGameControllerMessage(google::protobuf::Message *type)
{
    return m_externalGameControllerConnection.receiveGameControllerMessage(type);
}

bool GameControllerConnection::sendGameControllerMessage(const google::protobuf::Message *message)
{
    return m_externalGameControllerConnection.sendGameControllerMessage(message);
}
