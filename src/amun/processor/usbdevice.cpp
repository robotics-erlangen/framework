/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#include "usbdevice.h"
#include <libusb.h>
#include <QThread>
#include <QMutexLocker>

#if !defined(LIBUSB_CALL)
#define LIBUSB_CALL
#endif

class USBContext : public QThread
{
public:
    USBContext()
    {
        libusb_init(&m_context);
        m_completed = 0;
    }

    ~USBContext()
    {
        m_completed = 1;
        wait();
        libusb_exit(m_context);
    }

public:
    libusb_context* context() const { return m_context; }

protected:
    void run()
    {
        while (!m_completed) {
            timeval tv;
            tv.tv_sec = 0;
            tv.tv_usec = 100000;
            libusb_handle_events_timeout_completed(m_context, &tv, &m_completed);
        }
    }

private:
    libusb_context *m_context;
    int m_completed;
};

struct USBDevicePrivateData
{
    libusb_device* device;
    libusb_device_handle* handle;
    libusb_device_descriptor descriptor;
};

QList<USBDevice*> USBDevice::getDevices(quint16 vendorId, quint16 productId)
{
    QSharedPointer<USBContext> context(new USBContext);
    QList<USBDevice*> devices;

    // list usb devices
    libusb_device** deviceList;
    const int n = libusb_get_device_list(context->context(), &deviceList);
    for (int i = 0; i < n; i++) {
        libusb_device_descriptor descriptor;
        // always succeeds if libusb version >= 1.0.16
        libusb_get_device_descriptor(deviceList[i], &descriptor);
        if (((descriptor.idVendor == vendorId) || (vendorId == 0)) &&
                ((descriptor.idProduct == productId) || (productId == 0)))
        {
            // usbdevice increases the refcount of a device to prevent garbage collection
            devices.append(new USBDevice(context, deviceList[i]));
        }
    }

    // cleanup
    libusb_free_device_list(deviceList, true);

    // start poll thread
    if (!devices.isEmpty()) {
        context->start();
    }

    return devices;
}

USBDevice::USBDevice(QSharedPointer<USBContext> context, void *device) :
    m_context(context),
    m_timeout(1000),
    m_bufferSize(0),
    m_mutex(QMutex::Recursive),
    m_inboundTransfer(NULL),
    m_readError(false)
{
    m_data = new USBDevicePrivateData;
    m_data->device = (libusb_device*) device;
    m_data->handle = NULL;

    // reference decive to prevent collection of device information
    libusb_ref_device(m_data->device);
    libusb_get_device_descriptor(m_data->device, &m_data->descriptor);
}

USBDevice::~USBDevice()
{
    close();

    libusb_unref_device(m_data->device);
    delete m_data;
}

void USBDevice::setErrorString(int error)
{
    QIODevice::setErrorString(getErrorString(error));
}

QString USBDevice::getErrorString(int error)
{
    switch (error) {
    case LIBUSB_SUCCESS:
        return "Success";
    case LIBUSB_ERROR_IO:
        return "Input/output error";
    case LIBUSB_ERROR_INVALID_PARAM:
        return "Invalid parameter";
    case LIBUSB_ERROR_ACCESS:
        return "Access denied (insufficient permissions)";
    case LIBUSB_ERROR_NO_DEVICE:
        return "No such device (it may have been disconnected)";
    case LIBUSB_ERROR_NOT_FOUND:
        return "Entity not found";
    case LIBUSB_ERROR_BUSY:
        return "Resource busy";
    case LIBUSB_ERROR_TIMEOUT:
        return "Operation timed out";
    case LIBUSB_ERROR_OVERFLOW:
        return "Overflow";
    case LIBUSB_ERROR_PIPE:
        return "Pipe error";
    case LIBUSB_ERROR_INTERRUPTED:
        return "System call interrupted (perhaps due to signal)";
    case LIBUSB_ERROR_NO_MEM:
        return "Insufficient memory";
    case LIBUSB_ERROR_NOT_SUPPORTED:
        return "Operation not supported or unimplemented on this platform";
    case LIBUSB_ERROR_OTHER:
        return "Other error";
    }

    return "Unknown error";
}

bool USBDevice::open(OpenMode)
{
    close();

    int ret;

    // try to open the device
    ret = libusb_open(m_data->device, &m_data->handle);
    if (ret < 0) {
        setErrorString(ret);
        return false;
    }

    // select the interface
    ret = libusb_claim_interface(m_data->handle, 0);
    if (ret < 0) {
        setErrorString(ret);
        libusb_close(m_data->handle);
        m_data->handle = NULL;
        return false;
    }

    // get serial number
    unsigned char c[64];
    ret = libusb_get_string_descriptor(m_data->handle, m_data->descriptor.iSerialNumber, 0, c, sizeof(c));
    if (ret < 0) {
        setErrorString(ret);
        libusb_release_interface(m_data->handle, 0);
        libusb_close(m_data->handle);
        m_data->handle = NULL;
        return false;
    }
    m_serialNumber = QString::fromUtf16((const ushort *) &c[2], (qMin<int>(ret, c[0]) - 2) / 2);

    // get id
    ret = libusb_get_string_descriptor(m_data->handle, 4, 0, c, sizeof(c));
    if (ret < 0) {
        setErrorString(ret);
        libusb_release_interface(m_data->handle, 0);
        libusb_close(m_data->handle);
        m_data->handle = NULL;
        return false;
    }
    m_id = QString::fromUtf16((const ushort *) &c[2], (qMin<int>(ret, c[0]) - 2) / 2);

    // create transfer for receiving robot status
    startInTransfer();
    return QIODevice::open(ReadWrite | Unbuffered);
}

void USBDevice::close()
{
    QIODevice::close();
    if (m_data->handle) {
        QMutexLocker m(&m_mutex);
        if (m_inboundTransfer != NULL) {
            libusb_cancel_transfer(m_inboundTransfer);
            m_inboundTransfer = NULL;
        }

        libusb_release_interface(m_data->handle, 0);
        libusb_close(m_data->handle);
        m_data->handle = NULL;
    }
}

bool USBDevice::isSequential() const
{
    return true;
}

void USBDevice::setTimeout(int timeout)
{
    m_timeout = timeout;
}

QString USBDevice::vendorIdString() const
{
    return QString("0x%1").arg(vendorId(), 4, 16, QChar('0'));
}

QString USBDevice::productIdString() const
{
    return QString("0x%1").arg(productId(), 4, 16, QChar('0'));
}

quint16 USBDevice::vendorId() const
{
    return m_data->descriptor.idVendor;
}

quint16 USBDevice::productId() const
{
    return m_data->descriptor.idProduct;
}

LIBUSB_CALL void inCallback(libusb_transfer* transfer)
{
    // don't call the device as it might already have been destroyed
    if (transfer->status != LIBUSB_TRANSFER_CANCELLED) {
        USBDevice *device = reinterpret_cast<USBDevice*>(transfer->user_data);
        device->inCallback(transfer);
    }
    libusb_free_transfer(transfer);
}

void USBDevice::inCallback(libusb_transfer *transfer)
{
    QMutexLocker m(&m_mutex);
    // transfer has completed, allow starting a new one
    m_inboundTransfer = NULL;
    if (transfer->status == LIBUSB_TRANSFER_COMPLETED) {
        m_bufferSize = transfer->actual_length;
        // transfer is started after everything was read
        emit readyRead();
    } else if (transfer->status == LIBUSB_TRANSFER_TIMED_OUT) {
        // reschedule transfer
        startInTransfer();
    } else {
        // error
        setErrorString(transfer->status);
        m_readError = true;
    }
}

void USBDevice::startInTransfer()
{
    QMutexLocker m(&m_mutex);
    // make sure to have at most one inbound transfer!
    if (m_inboundTransfer != NULL) {
        return;
    }

    // create transfer for receiving inbound transmissions
    m_inboundTransfer = libusb_alloc_transfer(0);
    if (m_inboundTransfer == NULL) {
        setErrorString(LIBUSB_ERROR_NO_MEM);
        m_readError = true;
        return;
    }
    libusb_fill_bulk_transfer(m_inboundTransfer, m_data->handle, LIBUSB_ENDPOINT_IN | 0x02, m_buffer, sizeof(m_buffer), ::inCallback, this, m_timeout);
    int ret = libusb_submit_transfer(m_inboundTransfer);
    if (ret < 0) {
        // error
        setErrorString(ret);
        m_inboundTransfer = NULL;
        m_readError = true;
    }
}

qint64 USBDevice::readData(char* data, qint64 maxSize)
{
    if (!m_data->handle || m_readError)
        return -1;

    // copy data from buffer
    const qint64 l = qMin(maxSize, m_bufferSize);
    memcpy(data, m_buffer, l);
    // shift bytes to correctly handle possibly too small data buffer
    m_bufferSize -= l;
    memmove(m_buffer, m_buffer + l, m_bufferSize);
    if (m_bufferSize == 0) {
        // trigger starting next transfer
        startInTransfer();
    }
    return l;
}

qint64 USBDevice::writeData(const char* data, qint64 maxSize)
{
    if (!m_data->handle || m_readError)
        return -1;

    // send data
    int length = 0;
    int ret = libusb_bulk_transfer(m_data->handle, LIBUSB_ENDPOINT_OUT | 0x01, (unsigned char*) data, maxSize, &length, m_timeout);
    if (ret < 0) {
        setErrorString(ret);
        return -1;
    }

    return length;
}
