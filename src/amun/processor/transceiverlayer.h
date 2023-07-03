/***************************************************************************
 *   Copyright 2022 Paul Bergmann                                          *
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

#ifndef TRANSCEIVERLAYER_H
#define TRANSCEIVERLAYER_H

#include "protobuf/command.h"
#include "protobuf/status.h"
#include <QObject>

namespace Radio { class Address; }

class TransceiverLayer : public QObject {
    Q_OBJECT
public:
    TransceiverLayer(QObject *parent = nullptr)
        : QObject(parent) {}
    virtual ~TransceiverLayer() = default;

    virtual bool isOpen() const = 0;

    virtual void newCycle() = 0;

    virtual bool open(int which) = 0;

    virtual void addSendCommand(const Radio::Address &target, size_t expectedResponseSize, const char *data, size_t len) = 0;

    virtual void addPingPacket(qint64 time) = 0;
    virtual void addStatusPacket() = 0;

    virtual void flush(qint64 time) = 0;

signals:
    void sendStatus(const Status &status);
    void errorOccurred(const QString &transceiverName, const QString &errorMsg, qint64 restartDelayInNs = 0);
    void sendRawRadioResponses(qint64 receiveTime, const QList<QByteArray> &rawResponses);
    void deviceResponded(const QString &transceiverName);

public slots:
    virtual void handleCommand(const Command &command) = 0;

protected:
    /** When multiple transceivers of the same kind are used, this can be used
     * to differentiate them
     */
    int m_which = -1;

};

#endif // TRANSCEIVERLAYER_H
