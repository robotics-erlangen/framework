/***************************************************************************
 *   Copyright 2017 Alexander Danzer                                       *
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

#include "miniprocessor.h"
#include "strategy/strategy.h"
#include "logfile/logfilewriter.h"

MiniProcessor::MiniProcessor(Strategy *strategy, QString outputFilename):
    m_status(new amun::Status),
    m_hasStrategy(strategy != nullptr)
{
    if (m_hasStrategy) {
        connect(this, SIGNAL(sendStatus(Status)), strategy, SLOT(handleStatus(Status)));
        connect(strategy, SIGNAL(sendStatus(Status)), this, SLOT(handleStatus(Status)), Qt::BlockingQueuedConnection);
        connect(this, SIGNAL(sendCommand(Command)), strategy, SLOT(handleCommand(Command)));
    }

    m_logFileOut.open(outputFilename);
}

MiniProcessor::~MiniProcessor()
{
    m_logFileOut.close();
}


void MiniProcessor::handleStatus(const Status &status)
{
    status->set_time(m_status->time());
    m_logFileOut.writeStatus(status);
    m_logFileOut.writeStatus(m_status);
    m_mutex.unlock();
}


void MiniProcessor::setCurrentStatus(const Status &status)
{
    if (m_hasStrategy) {
        m_mutex.lock();
        m_status->CopyFrom(*status);
    } else {
        m_logFileOut.writeStatus(status);
    }
}


