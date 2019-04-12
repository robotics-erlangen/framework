#ifndef GAMECONTROLLERCONNECTION_H
#define GAMECONTROLLERCONNECTION_H

#include "externalgamecontroller.h"
#include "internalgamecontroller.h"
#include "protobuf/ssl_game_controller_common.pb.h"
#include <google/protobuf/message.h>
#include <QObject>
#include <QList>

class GameControllerConnection : public QObject
{
    Q_OBJECT

public:
    GameControllerConnection(bool isAutoref);
    GameControllerConnection(InternalGameController *internalGameController, bool isAutoref);
    bool connectGameController();
    void closeConnection();
    bool receiveGameControllerMessage(google::protobuf::Message *type);
    bool sendGameControllerMessage(const google::protobuf::Message *message, const QString &messageType);

public slots:
    void handleRefereeHost(QString host);
    void switchInternalGameController(bool isInternal);

signals:
    void gotMessageForInternaleGameController(std::shared_ptr<gameController::AutoRefToController> message);

private slots:
    void handleInternalGameControllerReply(const gameController::ControllerReply &reply);

private:
    bool m_useInternalGameController = true;
    bool m_isAutoref;

    QList<gameController::ControllerReply> m_internalGameControllerReplies;
    ExternalGameController m_externalGameControllerConnection;
};

#endif // GAMECONTROLLERCONNECTION_H
