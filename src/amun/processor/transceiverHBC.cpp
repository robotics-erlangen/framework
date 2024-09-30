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

#include "transceiverHBC.h"

#include "core/timer.h"
#include "radio_address.h"
#include "transceiver2015.h"
#include "transceiverlayer.h"
#include "usbdevice.h"
#include "usbthread.h"
#include <QByteArray>
#include <QString>
#include <libusb.h>
#include <memory>
#include <qeventloop.h>
#include <qtimer.h>

using namespace Radio;

typedef struct
{
    int64_t time;
} __attribute__ ((packed)) TransceiverPingData;

const int PROTOCOL_VERSION = 5;

constexpr qint16 HBC_VENDOR_ID  = 0x09fb;
constexpr qint16 HBC_PRODUCT_ID_PRIMARY = 0x0de2;
constexpr qint16 HBC_PRODUCT_ID_SECONDARY = 0x0ee2;

std::pair<std::vector<std::unique_ptr<TransceiverLayer>>, std::vector<TransceiverError>> TransceiverHBC::tryOpen(USBThread* context, const Timer* timer, QObject* parent)
{
    std::vector<std::unique_ptr<TransceiverLayer>> transceivers;
    std::vector<TransceiverError> errors;
#ifdef USB_FOUND
    const auto baseName = QString {"HBC"};
    constexpr auto vidForKind = [](Kind kind) {
        return HBC_VENDOR_ID;
    };

    constexpr auto pidForKind = [](Kind kind) {
        switch (kind) {
            case Kind::Primary:
                return HBC_PRODUCT_ID_PRIMARY;
            case Kind::Secondary:
                return HBC_PRODUCT_ID_SECONDARY;
        }
    };

    constexpr auto getNameForKind = [](Kind kind) {
        switch (kind) {
            case Kind::Primary:
                return "HBCPrim";
            case Kind::Secondary:
                return "HBCSec";
        };
    };

    for (const Kind kind : {Kind::Primary, Kind::Secondary}) {
        const auto vid = vidForKind(kind);
        const auto pid = pidForKind(kind);

        QList<USBDevice*> devices = USBDevice::getDevices(vid, pid, context);
        if (devices.isEmpty()) {
            continue;
        }

        const auto name = getNameForKind(kind);
        if (devices.size() > 1) {
            errors.emplace_back(baseName, QString{"More than one %1 does not make sense!"}.arg(name));
            continue;
        }

        USBDevice *device = devices.takeFirst();
        // devices should be empty now, but just in case delete the rest of the list
        qDeleteAll(devices);

        // can't be make_unique, because the constructor is private, which means make_unique can't call it
        auto transceiver = std::unique_ptr<TransceiverHBC>(new TransceiverHBC(device, timer, name, kind));

        connect(transceiver.get(), SIGNAL(sendStatus(Status)), parent, SIGNAL(sendStatus(Status)));
        connect(transceiver.get(), SIGNAL(errorOccurred(QString, QString, qint64)), parent, SLOT(transceiverErrorOccurred(QString, QString, qint64)));
        connect(transceiver.get(), SIGNAL(sendRawRadioResponses(qint64, QList<QByteArray>)), parent, SLOT(onRawRadioResponse(qint64, QList<QByteArray>)));
        // TODO We should keep a per device timeout
        connect(transceiver.get(), SIGNAL(deviceResponded(QString)), parent, SLOT(transceiverResponded(QString)));

        // try to open the communication channel
        if (!transceiver->m_device->open(QIODevice::ReadWrite)) {
            errors.emplace_back(name, device->errorString());
            continue;
        }

        transceiver->sendInitPacket();
        QEventLoop loop;
        connect(transceiver.get(), &Transceiver2015::connectionSucceeded, &loop, &QEventLoop::quit, Qt::ConnectionType::DirectConnection);
        QTimer timer;
        connect(&timer, &QTimer::timeout, &loop, &QEventLoop::quit, Qt::ConnectionType::DirectConnection);
        timer.setSingleShot(true);
        timer.start(100);
        loop.exec();

        // only add transceiver if it is connected after handshake
        if (transceiver->isOpen()) {
            transceivers.push_back(std::move(transceiver));
        } else {
            errors.emplace_back(name, "Handshake timed out!");
        }
    }

#else
    errors.emplace_back("T2015|HBC", "Compiled without libusb support!");
#endif // USB_FOUND
    return {std::move(transceivers), std::move(errors)};
}

TransceiverHBC::TransceiverHBC(USBDevice *device,  const Timer *timer, QString debugName, Kind kind) :
    Transceiver2015(device, timer, debugName),
    m_kind(kind)
{
}

void TransceiverHBC::addSendCommand(const Radio::Address &target, size_t expectedResponseSize, const char *data, size_t len)
{
    // the HBC transceivers can only send to one half of the ids of the robots, so it does not make sense to send commands for all 16 to
    // every single one of them
    if ((m_kind == Kind::Primary && target.unicastTarget() > 7) || (m_kind == Kind::Secondary && target.unicastTarget() < 8)) {
        return;
    }

    Transceiver2015::addSendCommand(target, expectedResponseSize, data, len);
}
