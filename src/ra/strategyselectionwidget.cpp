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

#include "config/config.h"
#include "strategysearch.h"
#include "strategyselectionwidget.h"
#include "ui_strategyselectionwidget.h"

#include <QDir>
#include <QSettings>

StrategySelectionWidget::StrategySelectionWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::StrategySelectionWidget)
{
    ui->setupUi(this);

    connect(this, SIGNAL(setUseDarkColors(bool)), ui->blue, SLOT(setUseDarkColors(bool)));
    connect(this, SIGNAL(setUseDarkColors(bool)), ui->yellow, SLOT(setUseDarkColors(bool)));
}

StrategySelectionWidget::~StrategySelectionWidget()
{
    saveConfig(false);
    delete ui;
}

void StrategySelectionWidget::saveConfig(bool saveTeams)
{
    QSettings s;

    s.beginGroup("Strategy");
    s.setValue("RecentScripts", *m_recentScripts);
    s.endGroup();

    if (saveTeams) {
        ui->blue->saveConfig();
        ui->yellow->saveConfig();
    }
}

void StrategySelectionWidget::shutdown()
{
    ui->yellow->shutdown();
    ui->blue->shutdown();
}

void StrategySelectionWidget::enableContent(bool enable)
{
    ui->blue->enableContent(enable);
    ui->yellow->enableContent(enable);
    m_contentDisabled = !enable;
}

void StrategySelectionWidget::init(QWidget *window)
{
    connect(window, SIGNAL(gotStatus(Status)), ui->blue, SLOT(handleStatus(Status)));
    connect(ui->blue, SIGNAL(sendCommand(Command)), window, SLOT(sendCommand(Command)));
    connect(window, SIGNAL(gotStatus(Status)), ui->yellow, SLOT(handleStatus(Status)));
    connect(ui->yellow, SIGNAL(sendCommand(Command)), window, SLOT(sendCommand(Command)));

    ui->blue->init(amun::StatusStrategyWrapper::BLUE);
    ui->yellow->init(amun::StatusStrategyWrapper::YELLOW);
}

void StrategySelectionWidget::loadStrategies()
{
    QSettings s;
    s.beginGroup("Strategy");
    QStringList newRecent = s.value("RecentScripts").toStringList();
    s.endGroup();

    newRecent = ra::sanitizeRecentScripts(newRecent, { "init.ts", "init.lua" });
    ra::searchForStrategies(newRecent, QDir::homePath() + "/Robotics/strategy/typescript/", "init.ts");
    ra::searchForStrategies(newRecent, QString(ERFORCE_STRATEGYDIR) + "lua/", "init.lua");
    ra::searchForStrategies(newRecent, QString(ERFORCE_STRATEGYDIR) + "typescript/", "init.ts");
    m_recentScripts = std::make_shared<QStringList>(newRecent);

    ui->blue->setRecentScripts(m_recentScripts);
    ui->yellow->setRecentScripts(m_recentScripts);

    ui->blue->load();
    ui->yellow->load();
    m_isInitialized = true;
}

void StrategySelectionWidget::forceAutoReload(bool force)
{
    ui->blue->forceAutoReload(force);
    ui->yellow->forceAutoReload(force);
}
