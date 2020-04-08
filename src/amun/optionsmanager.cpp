/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include "optionsmanager.h"

OptionsManager::OptionsManager(QObject *parent) :
    QObject(parent)
{

}

void OptionsManager::handleStrategyStatus(const amun::StatusStrategy &strategy)
{
    bool changed = false;
    for (const auto &option: strategy.options()) {
        std::string name = option.name();
        bool defaultValue = true;
        if (option.has_default_value()) {
            defaultValue = option.default_value();
        }

        if (!m_currentOptions.contains(name)) {
            m_currentOptions[name] = defaultValue;
            changed = true;
        }
    }

    if (changed) {
        sendOptions();
    }
}

void OptionsManager::sendOptions()
{
    Status status(new amun::Status);
    auto *amunState = status->mutable_amun_state();
    for (const auto &name : m_currentOptions.keys()) {
        auto *option = amunState->add_options();
        option->set_name(name);
        option->set_value(m_currentOptions[name]);
    }

    emit sendStatus(status);
}

void OptionsManager::handleStatus(const Status &status)
{
    if (status->has_status_strategy()) {
        handleStrategyStatus(status->status_strategy().status());
    }
}

void OptionsManager::handleCommand(const Command &command)
{
    if (command->has_amun() && command->amun().has_change_option()) {
        const auto &change = command->amun().change_option();
        const std::string &name = change.name();
        auto it = m_currentOptions.find(name);
        if (it == m_currentOptions.end() || it.value() != change.value()) {
            m_currentOptions[name] = change.value();
            sendOptions();
        }
    }
}
