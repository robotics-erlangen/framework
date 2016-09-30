/***************************************************************************
 *   Copyright 2016 Michael Eischer, Philipp Nordhus                       *
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

#include "amunclient.h"
#include "amun.h"
#include <QThread>

AmunClient::AmunClient(QObject *parent) :
    QObject(parent),
    m_amun(NULL),
    m_amunThread(NULL)
{
}

AmunClient::~AmunClient()
{
    stop();
}

void AmunClient::start(bool simulatorOnly)
{
    m_amunThread = new QThread(this);
    m_amun = new Amun(simulatorOnly);
    m_amun->moveToThread(m_amunThread);
    connect(m_amunThread, SIGNAL(finished()), m_amun, SLOT(deleteLater()));

    connect(m_amun, SIGNAL(sendStatus(Status)), SIGNAL(gotStatus(Status)));
    connect(this, SIGNAL(sendCommand(Command)), m_amun, SLOT(handleCommand(Command)));
    m_amun->start();
    m_amunThread->start();
}

void AmunClient::stop()
{
    m_amunThread->quit();
    m_amunThread->wait();
    delete m_amunThread;
    m_amunThread = NULL;

    // deleted on thread shutdown
    m_amun = NULL;
}
