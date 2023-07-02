/***************************************************************************
 *   Copyright 2022 Michael Bleier, Michael Eischer, Jan Kallwies,         *
 *       Philipp Nordhus, Paul Bergmann                                    *
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

#ifndef TRANSCEIVER2015_H
#define TRANSCEIVER2015_H

#include "protobuf/command.h"
#include "protobuf/status.h"
#include "transceiverlayer.h"
#include <QByteArray>
#include <QObject>

class QString;
class Timer;
class USBDevice;
class USBThread;
namespace Radio { class Address; }

class Transceiver2015 : public TransceiverLayer
{
    Q_OBJECT

private:
    enum class State {
        DISCONNECTED,
        HANDSHAKE,
        CONNECTED
    };

public:
    enum class Kind {
        Actual2015,
        HBC,
    };
public:
    static int numDevicesPresent(Kind);

    Transceiver2015(const Transceiver2015&) = delete;
    Transceiver2015& operator=(const Transceiver2015&) = delete;

    explicit Transceiver2015(Kind, const Timer *timer, QObject *parent = nullptr);
    ~Transceiver2015() override;

    bool isOpen() const final {
        return m_device && m_connectionState == State::CONNECTED;
    }

    void newCycle() final { m_packet.resize(0); }

    bool open() final;

    void addSendCommand(const Radio::Address &target, size_t expectedResponseSize, const char *data, size_t len) final;

    void addPingPacket(qint64 time) final;
    void addStatusPacket() final;

    void flush(qint64 time) final;

public slots:
    void handleCommand(const Command &command) final;

private slots:
    void onReadyRead();

private:
    bool write(const QByteArray &packet);
    void close();

    void handleInitPacket(const char *data, uint size);
    void handlePingPacket(const char *data, uint size);
    void handleStatusPacket(const char *data, uint size);
    void handleDatagramPacket(const char *data, uint size);

    void sendInitPacket();
    void sendTransceiverConfiguration();

private:
    /** Both Transceiver2015 and HBC use the same command protocol with
     * different Vendor and Product IDs
     */
    Kind m_kind;

    State m_connectionState = State::DISCONNECTED;
    USBThread *m_context = nullptr;
    USBDevice *m_device = nullptr;
    const Timer *m_timer = nullptr;

    amun::TransceiverConfiguration m_configuration;

    QByteArray m_packet;
};

#endif // TRANSCEIVER2015_H
