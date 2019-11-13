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

#ifndef TRANSCEIVER_H
#define TRANSCEIVER_H

#include "protobuf/command.h"
#include "protobuf/status.h"

#include <QMap>
#include <QPair>

class QTimer;
class Timer;
class USBThread;
class USBDevice;

class Transceiver : public QObject
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

    enum class State {
        DISCONNECTED,
        HANDSHAKE,
        CONNECTED
    };

public:
    explicit Transceiver(const Timer *timer);
    ~Transceiver() override;
    Transceiver(const Transceiver&) = delete;
    Transceiver& operator=(const Transceiver&) = delete;

signals:
    void sendStatus(const Status &status);
    void sendRadioResponses(const QList<robot::RadioResponse> &responses);

public slots:
    void handleRadioCommands(const QList<robot::RadioCommand> &commands, qint64 processingStart);
    void handleCommand(const Command &command);

private slots:
    void process();
    void receive();
    void timeout();

private:
    void open();
    bool ensureOpen();
    void close(const QString &errorMsg = QString(), qint64 restartDelayInNs = 0);
    bool write(const char *data, qint64 size);

    void handleInitPacket(const char *data, uint size);
    void handlePingPacket(const char *data, uint size);
    void handleStatusPacket(const char *data, uint size);
    void handleDatagramPacket(const char *data, uint size);
    float calculateDroppedFramesRatio(uint generation, uint id, uint8_t counter, int skipedFrames);
    void handleResponsePacket(QList<robot::RadioResponse> &response, const char *data, uint size, qint64 time);
    void handleTeam(const robot::Team &team);

    void sendInitPacket();
    void sendTransceiverConfiguration();

    void addRobot2014Command(int id, const robot::Command &command, bool charge, quint8 packetCounter, QByteArray &usb_packet);
    void addRobot2014Sync(qint64 processingDelay, quint8 packetCounter, QByteArray &usb_packet);

    // for now the 2018 functions mostly copy paste of the 2014 functions
    void addRobot2018Command(int id, const robot::Command &command, bool charge, quint8 packetCounter, QByteArray &usb_packet);
    void addRobot2018Sync(qint64 processingDelay, quint8 packetCounter, QByteArray &usb_packet);

    void addPingPacket(qint64 time, QByteArray &usb_packet);
    void addStatusPacket(QByteArray &usb_packet);
    void sendCommand(const QList<robot::RadioCommand> &commands, bool charge, qint64 processingStart);

private:
    bool m_charge;
    amun::TransceiverConfiguration m_configuration;
    QMap<QPair<uint, uint>, DroppedFrameCounter> m_droppedFrames;
    QMap<QPair<uint, uint>, uint> m_ir_param;
    QMap<quint8, qint64> m_frameTimes;

    quint8 m_packetCounter;
    USBThread *m_context;
    USBDevice *m_device;
    QTimer *m_timeoutTimer;
    QTimer *m_processTimer;
    State m_connectionState;
    bool m_simulatorEnabled;
    qint64 m_onlyRestartAfterTimestamp;

    const Timer *m_timer;
    QList<robot::RadioCommand> m_commands;
    qint64 m_processingStart;
    int m_droppedCommands;
};

#endif // TRANSCEIVER_H
