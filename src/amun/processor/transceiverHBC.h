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

#include "transceiver2015.h"
#include <QByteArray>
#include <QObject>
#include <QString>
#include <variant>

class Timer;
class USBDevice;
class USBThread;
namespace Radio { class Address; }

class TransceiverHBC : public Transceiver2015
{
    Q_OBJECT

private:
    enum class Kind {
        Primary, // sends commands to ids 0-7
        Secondary, // sends commands to ids 8-15
    };
public:
    static std::pair<std::vector<std::unique_ptr<TransceiverLayer>>, std::vector<TransceiverError>> tryOpen(USBThread * context, const Timer *timer, QObject *parent = nullptr);

    TransceiverHBC(const TransceiverHBC&) = delete;
    TransceiverHBC& operator=(const TransceiverHBC&) = delete;

    void addSendCommand(const Radio::Address &target, size_t expectedResponseSize, const char *data, size_t len) final;

private:
    static std::variant<TransceiverHBC, TransceiverError> tryOpen(USBThread * context, Kind kind, const Timer *timer, QObject *parent = nullptr);
    explicit TransceiverHBC(USBDevice *device, const Timer *timer, QString debugName, Kind kind);

private:
    /** Both Transceiver2015 and HBC use the same command protocol with
     * different Vendor and Product IDs
     */
    Kind m_kind;
};

#endif // TRANSCEIVER_HBC_H
