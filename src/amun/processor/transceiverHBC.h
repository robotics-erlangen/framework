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

#ifndef TRANSCEIVER_HBC_H
#define TRANSCEIVER_HBC_H

#include "protobuf/command.h"
#include "protobuf/status.h"
#include "transceiverlayer.h"
#include <QByteArray>
#include <QObject>
#include <QString>
#include <memory>
#include <optional>

class Timer;
class USBDevice;
class USBThread;
namespace Radio { class Address; }

class TransceiverHBC : public TransceiverLayer
{
    Q_OBJECT

private:
    enum class Kind {
        Primary, // sends commands to ids 0-7
        Secondary, // sends commands to ids 8-15
    };
    enum class State {
        DISCONNECTED,
        HANDSHAKE,
        CONNECTED
    };

public:
    [[nodiscard]] static std::pair<std::vector<std::unique_ptr<TransceiverLayer>>, std::vector<TransceiverError>> tryOpen(USBThread * context, const Timer *timer, QObject *parent = nullptr);

    TransceiverHBC(const TransceiverHBC&) = delete;
    TransceiverHBC& operator=(const TransceiverHBC&) = delete;

    ~TransceiverHBC() override;

    bool isOpen() const final {
        return m_connectionState == State::CONNECTED;
    }

    void newCycle() final { m_packet.resize(0); }

    static bool openDevice();

    void addSendCommand(const Radio::Address &target, size_t expectedResponseSize, const char *data, size_t len) final;

    void addPingPacket(qint64 time) final;
    void addStatusPacket() final;

    [[nodiscard]] std::optional<TransceiverError> flush(qint64 time) final;
    [[nodiscard]] std::optional<TransceiverError> handleCommand(const Command &command) final;

private:
    explicit TransceiverHBC(USBDevice *device, const Timer *timer, QString debugName, Kind kind);
    [[nodiscard]] std::optional<TransceiverError> read();
    [[nodiscard]] std::optional<TransceiverError> sendInitPacket();
    [[nodiscard]] std::optional<std::vector<TransceiverError>> tryConnect(QObject* parent);

    QByteArray buildRawRadioResponse(const char *data, uint size);

    [[nodiscard]] std::optional<TransceiverError> write(const QByteArray &packet);

    [[nodiscard]] std::optional<TransceiverError> handleInitPacket(const char *data, uint size);
    void handlePingPacket(const char *data, uint size);
    void handleStatusPacket(const char *data, uint size);
    void handleDatagramPacket(const char *data, uint size);

    [[nodiscard]] std::optional<TransceiverError> sendTransceiverConfiguration();

private slots:
    void onReadyRead();

signals:
    void connectionSucceeded();

protected:
    USBDevice *m_device = nullptr;
    State m_connectionState = State::DISCONNECTED;

private:
    USBThread *m_context = nullptr;
    const Timer *m_timer = nullptr;

    /** Both TransceiverHBC and HBC use the same command protocol with
     * different Vendor and Product IDs
     */
    Kind m_kind;

    QByteArray m_packet;

    QString m_debugName;
};

#endif // TRANSCEIVER_HBC_H
