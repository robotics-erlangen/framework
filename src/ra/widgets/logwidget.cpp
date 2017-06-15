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

#include <QDateTime>
#include <QMenu>

LogWidget::LogWidget(QWidget *parent) :
    QPlainTextEdit(parent),
    m_lastDate(0),
    m_hideLogToggles(false),
    m_logBlueStrategy(true),
    m_logYellowStrategy(true)
{
    this->setMaximumBlockCount(1000);
    this->setReadOnly(true);
}

void LogWidget::hideLogToggles()
{
    m_hideLogToggles = true;
}

void LogWidget::handleStatus(const Status &status)
{
    if (status->has_debug()) {
        const amun::DebugValues &debug = status->debug();

        QString logAppend;
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
                prefix = "A";
                break;
            case amun::RadioResponse:
                prefix = "R";
                break;
            }

            qint64 ldate = log.timestamp() / 1000000000L / 60; // divide down to minutes
            if (ldate != m_lastDate) {
                m_lastDate = ldate;
                QDateTime dt;
                dt.setTime_t(log.timestamp() * 1E-9);
                logAppend += QString("<div><small><tt>%1</tt></small</div>\n").arg(dt.toString("hh:mm"));
            }

            // extract seconds and milliseconds (these are completely locale independent)
            const QString time = QString("%1.%2").arg((log.timestamp() / 1000000000L) % 60, 2, 10, QChar('0'))
                    .arg((log.timestamp() / 1000000L) % 1000, 3, 10, QChar('0'));
            QString str = QString("<div><small><tt><font color=gray>[%1]</font><b> %2 </b></tt></small>").arg(time, prefix);
            logAppend += str + QString::fromStdString(log.text()) + "</div>\n";
        }
        if (logAppend.size() > 0) {
            appendHtml(logAppend);
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
    }
}
