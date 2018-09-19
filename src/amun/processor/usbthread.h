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

#ifndef USBTHREAD_H
#define USBTHREAD_H

#include <QThread>
#include <atomic>

struct libusb_context;

class USBThread : public QThread
{
public:
    USBThread();
    ~USBThread() override;
    USBThread(const USBThread&) = delete;
    USBThread& operator=(const USBThread&) = delete;

public:
    libusb_context* context() const { return m_context; }

protected:
    void run() override;

private:
    libusb_context *m_context;
    // ensure synchronization
    std::atomic<bool> m_completed;
};

#endif // USBTHREAD_H
