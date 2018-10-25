/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#include "abstractstrategyscript.h"
#include "core/timer.h"

AbstractStrategyScript::AbstractStrategyScript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled) :
    m_timer(timer),
    m_type(type),
    m_debugEnabled(debugEnabled),
    m_refboxControlEnabled(refboxControlEnabled),
    m_debugStatus(Status::createArena()),
    m_hasDebugger(false),
    m_debugHelper(nullptr),
    m_isInternalAutoref(false)
{ }

bool AbstractStrategyScript::triggerDebugger()
{
    // fail as default
    return false;
}

Status AbstractStrategyScript::takeDebugStatus()
{
    Status status = Status::createArena();
    status->CopyFrom(*m_debugStatus);
    m_debugStatus->Clear();
    return status;
}

void AbstractStrategyScript::setSelectedOptions(const QStringList &options)
{
    m_selectedOptions = options;
}

void AbstractStrategyScript::setDebugHelper(DebugHelper *helper) {
    m_debugHelper = helper;
}

bool AbstractStrategyScript::chooseEntryPoint(QString entryPoint)
{
    // cleanup entrypoints list
    m_entryPoints.sort();
    m_entryPoints.removeDuplicates();
    if (m_entryPoints.isEmpty()) {
        m_errorMsg = "<font color=\"red\">No entry points defined!</font>";
        return false;
    }

    m_entryPoint = entryPoint;
    // use first entry point as fallback
    if (!m_entryPoints.contains(m_entryPoint)) {
        m_entryPoint = m_entryPoints.first();
    }
    return true;
}

qint64 AbstractStrategyScript::time() const
{
    return m_timer->currentTime();
}

void AbstractStrategyScript::log(const QString &text)
{
    amun::StatusLog *log = m_debugStatus->mutable_debug()->add_log();
    log->set_timestamp(time());
    log->set_text(text.toStdString());
}

amun::Visualization *AbstractStrategyScript::addVisualization()
{
    return m_debugStatus->mutable_debug()->add_visualization();
}

void AbstractStrategyScript::removeVisualizations()
{
    m_debugStatus->mutable_debug()->clear_visualization();
}

amun::DebugValue *AbstractStrategyScript::addDebug()
{
    return m_debugStatus->mutable_debug()->add_value();
}

amun::PlotValue *AbstractStrategyScript::addPlot()
{
    return m_debugStatus->mutable_debug()->add_plot();
}

amun::RobotValue *AbstractStrategyScript::addRobotValue()
{
    return m_debugStatus->mutable_debug()->add_robot();
}

void AbstractStrategyScript::setCommand(uint generation, uint robotId, const RobotCommand &command)
{
    if (m_type != StrategyType::BLUE && m_type != StrategyType::YELLOW) {
        log("Only blue or yellow strategy may send robot commands!");
        return;
    }
    // movement commands are immediatelly forwarded to the processor
    // that is while the strategy is still running
    emit sendStrategyCommand(m_type == StrategyType::BLUE, generation, robotId, command, m_worldState.time());
}

bool AbstractStrategyScript::sendCommand(const Command &command)
{
    if (!m_debugEnabled) {
        return false;
    }
    emit gotCommand(command);
    return true;
}

bool AbstractStrategyScript::sendNetworkReferee(const QByteArray &referee)
{
    if (!m_debugEnabled || !m_refboxControlEnabled) {
        return false;
    }
    emit sendNetworkRefereeCommand(referee);
    return true;
}

void AbstractStrategyScript::sendMixedTeam(const QByteArray &info)
{
    emit sendMixedTeamInfo(info);
}

bool AbstractStrategyScript::loadScript(const QString &filename, const QString &entryPoint, const world::Geometry &geometry, const robot::Team &team)
{
    Q_ASSERT(m_filename.isNull());

    // startup strategy information
    m_filename = filename;
    m_name = "<no script>";
    // strategy modules are loaded relative to the init script
    m_baseDir = QFileInfo(m_filename).absoluteDir();

    m_geometry.CopyFrom(geometry);
    m_team.CopyFrom(team);

    return loadScript(filename, entryPoint);
}

bool AbstractStrategyScript::process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput)
{
    Q_ASSERT(!m_entryPoint.isNull());

    m_worldState.CopyFrom(worldState);
    m_worldState.clear_vision_frames();
    m_refereeState.CopyFrom(refereeState);
    m_userInput.CopyFrom(userInput);

    return process(pathPlanning);
}
