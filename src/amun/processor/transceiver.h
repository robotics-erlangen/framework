/***************************************************************************
 *   Copyright 2014 Michael Bleier, Michael Eischer, Philipp Nordhus       *
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

        DroppedFrameCounter() : startValue(-1), lastFrameCounter(0), droppedFramesCounter(0), droppedFramesRatio(0) {}
    };

public:
    Transceiver(QObject *parent = NULL);

signals:
    void sendStatus(Status status);
    void sendRadioResponses(const QList<robot::RadioResponse> &responses);

public slots:
    void handleRadioCommands(const QList<robot::RadioCommand> &commands);
    void handleCommand(const Command &command);

private slots:
    void receive();

private:
    bool open();
    void close();
    void sendCommand(const QList<robot::RadioCommand> &commands, bool charge);
    void sendParameters(const robot::RadioParameters &parameters);
    bool write(const char *data, qint64 size);
    void sendTransceiverConfiguration();
    float calculateDroppedFramesRatio(uint generation, uint id, uint8_t counter);

    void handleResponsePacket(QList<robot::RadioResponse> &response, const char *data, int size, qint64 time);

private:
    bool m_charge;
    amun::TransceiverConfiguration m_configuration;
    QMap<QPair<uint, uint>, DroppedFrameCounter> m_droppedFrames;

    quint8 m_number;
    quint8 m_counter2012;
    USBDevice *m_device;
};

#endif // TRANSCEIVER_H
