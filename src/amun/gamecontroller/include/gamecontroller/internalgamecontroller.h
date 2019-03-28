#ifndef INTERNALGAMECONTROLLER_H
#define INTERNALGAMECONTROLLER_H

#include "core/timer.h"
#include "protobuf/ssl_game_controller_team.pb.h"
#include "protobuf/ssl_game_controller_auto_ref.pb.h"
#include "protobuf/world.pb.h"
#include "protobuf/status.h"
#include "protobuf/command.h"
#include <QObject>

class InternalGameController : public QObject
{
    Q_OBJECT

public:
    InternalGameController(const Timer *timer);
    void handleGuiCommand(const QByteArray &data);

public slots:
    void handleStatus(const Status& status);
    void handleCommand(const amun::CommandReferee& refereeCommand);

signals:
    void gotPacketForReferee(const QByteArray &data);

private:
    world::Geometry m_geometry;

    const Timer *m_timer;
};

#endif // INTERNALGAMECONTROLLER_H
