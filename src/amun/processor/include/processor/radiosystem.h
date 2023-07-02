/***************************************************************************
 *   Copyright 2015 Michael Bleier, Michael Eischer, Philipp Nordhus       *
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

#ifndef RADIOSYSTEM_H
#define RADIOSYSTEM_H

#include "protobuf/command.h"
#include "protobuf/status.h"
#include "radio_address.h"

#include <QMap>
#include <QPair>

class QTimer;
class Timer;
class TransceiverLayer;

class RadioSystem : public QObject
{
    Q_OBJECT

private:
    struct DroppedFrameCounter {
        int startValue;
        int lastFrameCounter;
        uint8_t droppedFramesCounter;
        float droppedFramesRatio;
        int lastDroppedFrames;

        DroppedFrameCounter() : startValue(-1), lastFrameCounter(0), droppedFramesCounter(0),
            droppedFramesRatio(0), lastDroppedFrames(-1) {}
    };

public:
    explicit RadioSystem(const Timer *timer);

signals:
    void sendStatus(const Status &status);
    void sendRadioResponses(const QList<robot::RadioResponse> &responses);

public slots:
    void handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingStart);
    void handleCommand(const Command &command);

private slots:
    void process();
    void transceiverErrorOccurred(const QString &errorMsg, qint64 restartDelayInNs);
    void transceiverResponded();
    void timeout();
    void onRawRadioResponse(qint64 receiveTime, const QList<QByteArray> &rawResponses);

private:
    void openTransceiver();
    void closeTransceiver();
    bool ensureOpen();

    float calculateDroppedFramesRatio(Radio::Generation generation, uint id, uint8_t counter, int skipedFrames);
    void handleResponsePacket(QList<robot::RadioResponse> &response, const char *data, uint size, qint64 time);
    void handleTeam(const robot::Team &team);

    void addRobot2014Command(int id, const robot::Command &command, bool charge, quint8 packetCounter);
    void addRobot2014Sync(qint64 processingDelay, quint8 packetCounter);

    // for now the 2018 functions mostly copy paste of the 2014 functions
    void addRobot2018Command(int id, const robot::Command &command, bool charge, quint8 packetCounter);
    void addRobot2018Sync(qint64 processingDelay, quint8 packetCounter);

    void sendCommand(const QList<robot::RadioCommand> &commands, bool charge, qint64 processingStart);

private:
    bool m_charge;
    QMap<QPair<Radio::Generation, uint>, DroppedFrameCounter> m_droppedFrames;
    QMap<QPair<Radio::Generation, uint>, uint> m_ir_param;
    QMap<quint8, qint64> m_frameTimes;

    quint8 m_packetCounter;
    QTimer *m_timeoutTimer;
    QTimer *m_processTimer;
    bool m_simulatorEnabled;
    qint64 m_onlyRestartAfterTimestamp;

    const Timer *m_timer;
    QList<robot::RadioCommand> m_commands;
    qint64 m_processingStart;
    int m_droppedCommands;

    TransceiverLayer *m_transceiverLayer = nullptr;
};

#endif // RADIOSYSTEM_H
