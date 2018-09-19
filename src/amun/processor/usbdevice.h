/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef USBDEVICE_H
#define USBDEVICE_H

#include <QIODevice>
#include <QSharedPointer>
#include <QMutex>
#include <QSemaphore>
#include <atomic>

class USBThread;
struct USBDevicePrivateData;
struct libusb_transfer;

class USBDevice : public QIODevice
{
public:
    static QList<USBDevice*> getDevices(quint16 vendorId, quint16 productId, USBThread *context);

private:
    explicit USBDevice(void *device);

public:
    ~USBDevice() override;
    USBDevice(const USBDevice&) = delete;
    USBDevice& operator=(const USBDevice&) = delete;

public:
    bool open(OpenMode mode) override;
    void close() override;
    bool isSequential() const override;
    void setTimeout(int timeout);

public:
    QString vendorIdString() const;
    QString productIdString() const;
    quint16 vendorId() const;
    quint16 productId() const;
    const QString &serialNumber() const { return m_serialNumber; }

public:
    void inCallback(libusb_transfer *transfer);

protected:
    void startInTransfer();

    qint64 readData(char*, qint64) override;
    qint64 writeData(const char*, qint64) override;
    void setErrorString(int error);
    static QString getErrorString(int error);

private:
    USBDevicePrivateData* m_data;
    int m_timeout;
    quint8 m_buffer[512];
    qint64 m_bufferSize;

    QMutex m_mutex;
    libusb_transfer *m_inboundTransfer;

    QSemaphore m_shutdownSemaphore;
    bool m_shutingDown;

    std::atomic_bool m_readError;
    QString m_serialNumber;
};

#endif // USBDEVICE_H
