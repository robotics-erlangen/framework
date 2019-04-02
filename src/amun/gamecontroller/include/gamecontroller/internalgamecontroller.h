#ifndef INTERNALGAMECONTROLLER_H
#define INTERNALGAMECONTROLLER_H

#include "core/timer.h"
#include "protobuf/ssl_game_controller_team.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"
#include "protobuf/world.pb.h"
#include "protobuf/status.h"
#include "protobuf/command.h"

#include <QObject>
#include <QTimer>

class InternalGameController : public QObject
{
    Q_OBJECT

public:
    InternalGameController(const Timer *timer);
    void handleGuiCommand(const QByteArray &data);
    void handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message);

public slots:
    void handleStatus(const Status& status);
    void handleCommand(const amun::CommandReferee& refereeCommand);

signals:
    void gotPacketForReferee(const QByteArray &data);
    void gotControllerReply(const gameController::ControllerReply &reply);

private slots:
    void sendUpdate();
    void setScaling(double scaling);

private:
    struct Vector {
        float x, y;
    };
    Vector ballPlacementPosForFoul(Vector foulPosition);

private:
    const Timer *m_timer;

    world::Geometry m_geometry;

    SSL_Referee m_packet;
    qint64 m_currentActionStartTime;

    QTimer *m_trigger;

    const int UPDATE_INTERVAL_MS = 500;
};

#endif // INTERNALGAMECONTROLLER_H
