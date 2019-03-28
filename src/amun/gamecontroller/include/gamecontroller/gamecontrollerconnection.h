#ifndef GAMECONTROLLERCONNECTION_H
#define GAMECONTROLLERCONNECTION_H

#include "externalgamecontroller.h"
#include <google/protobuf/message.h>
#include <QObject>

class GameControllerConnection : public QObject
{
    Q_OBJECT

public:
    GameControllerConnection(bool isAutoref);
    bool connectGameController();
    void closeConnection();
    bool receiveGameControllerMessage(google::protobuf::Message *type);
    bool sendGameControllerMessage(const google::protobuf::Message *message);

public slots:
    void handleRefereeHost(QString host);

private:
    ExternalGameController m_externalGameControllerConnection;
};

#endif // GAMECONTROLLERCONNECTION_H
