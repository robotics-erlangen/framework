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

#include "logwidget.h"
#include "refereestatuswidget.h"

#include <QDateTime>
#include <QMenu>
#include <QTextBlock>

LogWidget::LogWidget(QWidget *parent) :
    QPlainTextEdit(parent),
    m_lastDate(0),
    m_hideLogToggles(false),
    m_logBlueStrategy(true),
    m_logBlueReplayStrategy(true),
    m_logYellowStrategy(true),
    m_logYellowReplayStrategy(true),
    m_logAutoref(true)
{
    const int MAX_BLOCKS = 1000;
    this->setMaximumBlockCount(MAX_BLOCKS);
    this->setReadOnly(true);
    m_lastTimes.setCapacity(MAX_BLOCKS);
}

void LogWidget::hideLogToggles()
{
    m_hideLogToggles = true;
}

QString LogWidget::fromTime(qint64 time, QString prefix) {
    qint64 ltime = time / 1000000000LL / 60; // divide down to minutes
    QString ret;
    if (ltime != m_lastDate) {
        m_lastDate = ltime;
        QDateTime dt;
        dt.setTime_t(time * 1E-9);
        ret += QString("<div><small><tt>%1</tt></small></div>\n").arg(dt.toString("hh:mm"));
    }
    const QString stime = QString("%1.%2").arg((time / 1000000000LL) % 60, 2, 10, QChar('0'))
            .arg((time / 1000000LL) % 1000, 3, 10, QChar('0'));
    QString str = QString("<div><small><tt><font color=gray>[%1]</font><b> %2 </b></tt></small>").arg(stime, prefix);
    return ret+str;
}

void LogWidget::handleStatus(const Status &status)
{
    QString logAppend;
    for (const amun::DebugValues& debug : status->debug()) {
        while (m_lastTimes.size() > 0 && m_lastTimes.last() > status->time()) {
            m_lastTimes.removeLast();
            QTextBlock block = document()->lastBlock();
            QTextCursor cursor(block);
            cursor.select(QTextCursor::BlockUnderCursor);
            cursor.removeSelectedText();
        }

        for (int i = 0; i < debug.log_size(); i++) {
            const amun::StatusLog &log = debug.log(i);

            // allow disabling strategy log output
            QString prefix;
            switch (debug.source()) {
            case amun::StrategyBlue:
                if (!m_logBlueStrategy) {
                    continue;
                }
                prefix = "B";
                break;
            case amun::StrategyYellow:
                if (!m_logYellowStrategy) {
                    continue;
                }
                prefix = "Y";
                break;
            case amun::Controller:
                prefix = "C";
                break;
            case amun::Tracking:
                prefix = "T";
                break;
            case amun::Autoref:
                if (!m_logAutoref) {
                    continue;
                }
                prefix = "A";
                break;
            case amun::RadioResponse:
                prefix = "R";
                break;
            case amun::ReplayBlue:
                if (!m_logBlueReplayStrategy) {
                    continue;
                }
                prefix = "BR";
                break;
            case amun::ReplayYellow:
                if (!m_logYellowReplayStrategy) {
                    continue;
                }
                prefix = "YR";
                break;
            case amun::GameController:
                prefix = "GC";
                break;
            }
            logAppend += fromTime(log.timestamp(), prefix) + QString::fromStdString(log.text()) + "</div>\n";
        }
    }
    if (logAppend.size() > 0) {
        appendHtml(logAppend);
        m_lastTimes.append(status->time());
    }
    if (status->has_game_state()) {
        const amun::GameState &game_state = status->game_state();
        for (const auto &event : game_state.game_event_2019()) {
            QString text = RefereeStatusWidget::gameEvent2019Message(event);
            QString splittedText = text.split("[")[0];
            if (!m_lastAutorefOutput.contains(splittedText)) {
                m_lastAutorefOutput.append(splittedText);
                text = fromTime(status->time(), QString("REF")) + text + "</div>";
                appendHtml(text);
                m_lastTimes.append(status->time());
            }
        }
        while (m_lastAutorefOutput.size() > game_state.game_event_2019_size()) {
            m_lastAutorefOutput.erase(m_lastAutorefOutput.begin());
        }
    }
}

void LogWidget::contextMenuEvent(QContextMenuEvent *event)
{
    QMenu *menu = createStandardContextMenu();
    menu->addSeparator();

    QAction* clear = menu->addAction("Clear");
    connect(clear, SIGNAL(triggered()), SLOT(clear()));

    if (!m_hideLogToggles) {
        QAction* blue = menu->addAction("Blue Strategy");
        blue->setCheckable(true);
        blue->setChecked(m_logBlueStrategy);
        blue->setData(amun::StrategyBlue);
        connect(blue, SIGNAL(triggered(bool)), SLOT(setLogVisibility(bool)));

        QAction* yellow = menu->addAction("Yellow Strategy");
        yellow->setCheckable(true);
        yellow->setChecked(m_logYellowStrategy);
        yellow->setData(amun::StrategyYellow);
        connect(yellow, SIGNAL(triggered(bool)), SLOT(setLogVisibility(bool)));

        QAction* autoref = menu->addAction("Autoref");
        autoref->setCheckable(true);
        autoref->setChecked(m_logAutoref);
        autoref->setData(amun::Autoref);
        connect(autoref, SIGNAL(triggered(bool)), SLOT(setLogVisibility(bool)));

        QAction* blueReplay = menu->addAction("Replay Blue");
        blueReplay->setCheckable(true);
        blueReplay->setChecked(m_logBlueReplayStrategy);
        blueReplay->setData(amun::ReplayBlue);
        connect(blueReplay, SIGNAL(triggered(bool)), SLOT(setLogVisibility(bool)));

        QAction* yellowReplay = menu->addAction("Replay Yellow");
        yellowReplay->setCheckable(true);
        yellowReplay->setChecked(m_logYellowReplayStrategy);
        yellowReplay->setData(amun::ReplayYellow);
        connect(yellowReplay, SIGNAL(triggered(bool)), SLOT(setLogVisibility(bool)));
    }

    menu->exec(event->globalPos());
    delete menu;
}

void LogWidget::setLogVisibility(bool visible)
{
    amun::DebugSource source = (amun::DebugSource) dynamic_cast<QAction*>(sender())->data().toInt();
    if (source == amun::StrategyBlue) {
        m_logBlueStrategy = visible;
    } else if (source == amun::StrategyYellow) {
        m_logYellowStrategy = visible;
    } else if (source == amun::Autoref) {
        m_logAutoref = visible;
    } else if (source == amun::ReplayBlue) {
        m_logBlueReplayStrategy = visible;
    } else if (source == amun::ReplayYellow) {
        m_logYellowReplayStrategy = visible;
    }
}
