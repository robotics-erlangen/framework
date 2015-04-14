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

#include "usbthread.h"

#include <libusb.h>

USBThread::USBThread()
{
    libusb_init(&m_context);
    m_completed = false;
    setObjectName("USBPollThread");
    start();
}

USBThread::~USBThread()
{
    m_completed = true;
    wait();
    libusb_exit(m_context);
}

void USBThread::run()
{
    while (!m_completed.load()) {
        timeval tv;
        tv.tv_sec = 0;
        tv.tv_usec = 100000;
        // just wait for the timeout
        // a clean solution would require to trigger an event
        // after m_completed is true
        libusb_handle_events_timeout(m_context, &tv);
    }
}
