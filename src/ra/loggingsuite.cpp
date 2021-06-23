/***************************************************************************
 *   Copyright 2020 Michael Eischer, Tobias Heineken, Philipp Nordhus      *
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
#include "loggingsuite.h"

Logsuite::Logsuite(QAction* logAction, QAction* backlogMenu, QAction* backlogButton, bool isReplay, QObject* parent) :
    QObject(parent),
    m_logAction(logAction),
    m_backlogActionMenu(backlogMenu),
    m_backlogButton(backlogButton),
    m_isReplay(isReplay)
{
    connect(m_backlogActionMenu, &QAction::triggered, this, &Logsuite::triggeredBacklog);
    connect(m_backlogButton, &QAction::triggered, this, &Logsuite::triggeredBacklog);
    connect(m_logAction, &QAction::toggled, this, &Logsuite::triggeredLog);
}

void Logsuite::handleStatus(const Status& status) {
    if (!status->has_pure_ui_response()) {
        return;
    }
    const amun::UiResponse& response = status->pure_ui_response();
    if (response.has_logging_info() && response.logging_info().is_replay_logger() == m_isReplay) {
        bool log = response.logging_info().is_logging();
        m_backlogActionMenu->setEnabled(!log);
        m_backlogButton->setEnabled(!log);
        if (!log) {
            m_logAction->setChecked(false);
        }
        emit isLogging(log);
    }
    if (response.has_enable_logging()){
        bool enabled = response.enable_logging();
        m_backlogActionMenu->setEnabled(enabled);
        m_backlogButton->setEnabled(enabled);
        m_logAction->setEnabled(enabled);
    }
}

void Logsuite::triggeredBacklog()
{
    Command c(new amun::Command());
    amun::CommandRecord* record = c->mutable_record();
    record->mutable_save_backlog();
    record->set_for_replay(m_isReplay);
    emit sendCommand(c);
}

void Logsuite::triggeredLog(bool enable)
{
    Command c(new amun::Command());
    amun::CommandRecord* record = c->mutable_record();
    record->set_run_logging(enable);
    record->set_for_replay(m_isReplay);
    emit sendCommand(c);
}
