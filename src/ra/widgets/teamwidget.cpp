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

#include "teamwidget.h"
#include "config/config.h"
#include "protobuf/command.pb.h"
#include "protobuf/status.pb.h"
#include <QAction>
#include <QBoxLayout>
#include <QContextMenuEvent>
#include <QFileDialog>
#include <QSettings>
#include <QToolButton>
#include <QMenu>

TeamWidget::TeamWidget(QWidget *parent) :
    QFrame(parent),
    m_type(amun::StatusStrategyWrapper::BLUE),
    m_userAutoReload(false),
    m_notification(false),
    m_compiling(false)
{
}

TeamWidget::~TeamWidget()
{
}

void TeamWidget::shutdown()
{
    saveConfig();
    closeScript();
}

void TeamWidget::saveConfig()
{
    QSettings s;
    s.beginGroup(teamTypeName());
    s.setValue("Script", m_filename);
    s.setValue("EntryPoint", m_entryPoint);
    s.setValue("AutoReload", m_userAutoReload);
    s.setValue("EnableDebug", m_btnEnableDebug->isChecked());
    s.setValue("PerformanceMode", m_performanceAction->isChecked());
    s.endGroup();
}

void TeamWidget::init(amun::StatusStrategyWrapper::StrategyType type)
{
    m_type = type;

    QBoxLayout *hLayout = new QHBoxLayout(this);
    hLayout->setMargin(4);
    hLayout->setSpacing(3);

    m_scriptMenu = new QMenu(this);
    m_actionDisable = m_scriptMenu->addAction("Disable");
    m_actionDisable->setVisible(false);
    connect(m_actionDisable, SIGNAL(triggered()), SLOT(closeScript()));
    QAction *action = m_scriptMenu->addAction("Browse");
    connect(action, SIGNAL(triggered()), SLOT(showOpenDialog()));
    connect(m_scriptMenu, SIGNAL(aboutToShow()), SLOT(prepareScriptMenu()));

    m_entryPoints = new QMenu(this);

    m_btnOpen = new QToolButton;
    m_btnOpen->setText("Disabled");
    m_btnOpen->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    m_btnOpen->setMenu(m_scriptMenu);
    m_btnOpen->setPopupMode(QToolButton::InstantPopup);
    connect(m_btnOpen, SIGNAL(clicked()), SLOT(showOpenDialog()));
    hLayout->addWidget(m_btnOpen);

    m_btnEntryPoint = new QToolButton;
    m_btnEntryPoint->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    m_btnEntryPoint->setText("<n/a>");
    m_btnEntryPoint->setVisible(false);
    m_btnEntryPoint->setPopupMode(QToolButton::InstantPopup);
    m_btnEntryPoint->setMenu(m_entryPoints);
    connect(m_btnEntryPoint, SIGNAL(triggered(QAction*)), SLOT(selectEntryPoint(QAction*)));
    hLayout->addWidget(m_btnEntryPoint);

    QIcon debugIcon;
    debugIcon.addFile("icon:32/debugging-disabled.png", QSize(), QIcon::Normal, QIcon::Off);
    debugIcon.addFile("icon:32/debugging-enabled.png", QSize(), QIcon::Normal, QIcon::On);
    m_btnEnableDebug = new QToolButton;
    m_btnEnableDebug->setIcon(debugIcon);
    m_btnEnableDebug->setToolTip("Enable debugging");
    m_btnEnableDebug->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Preferred);
    m_btnEnableDebug->setCheckable(true);
    if (m_type == amun::StatusStrategyWrapper::AUTOREF) {
        m_btnEnableDebug->setChecked(true);
        m_btnEnableDebug->setDisabled(true);
    }
    connect(m_btnEnableDebug, SIGNAL(toggled(bool)), SLOT(sendEnableDebug(bool)));
    hLayout->addWidget(m_btnEnableDebug);

    QMenu *reload_menu = new QMenu(this);
    m_reloadAction = reload_menu->addAction("Reload automatically");
    m_reloadAction->setCheckable(true);
    connect(m_reloadAction, SIGNAL(toggled(bool)), SLOT(sendAutoReload()));

    m_debugAction = reload_menu->addAction("Trigger debugger");
    m_debugAction->setEnabled(false);
    connect(m_debugAction, SIGNAL(triggered(bool)), SLOT(sendTriggerDebug()));

    m_performanceAction = reload_menu->addAction("Performance Mode");
    m_performanceAction->setCheckable(true);
    m_performanceAction->setChecked(true);
    connect(m_performanceAction, SIGNAL(toggled(bool)), SLOT(sendPerformanceDebug(bool)));

    m_btnReload = new QToolButton;
    m_btnReload->setToolTip("Reload script");
    m_btnReload->setIcon(QIcon("icon:32/view-refresh.png"));
    m_btnReload->setPopupMode(QToolButton::MenuButtonPopup);
    m_btnReload->setMenu(reload_menu);
    connect(m_btnReload, SIGNAL(clicked()), SLOT(sendReload()));
    hLayout->addWidget(m_btnReload);

    updateStyleSheet();
}

QString TeamWidget::teamTypeName() const
{
    switch (m_type) {
    case amun::StatusStrategyWrapper::BLUE:
        return "BlueTeam";
    case amun::StatusStrategyWrapper::YELLOW:
        return "YellowTeam";
    case amun::StatusStrategyWrapper::AUTOREF:
        return "Autoref";
    case amun::StatusStrategyWrapper::REPLAY_BLUE:
        return "ReplayBlue";
    case amun::StatusStrategyWrapper::REPLAY_YELLOW:
        return "ReplayYellow";
    }
    return "";
}

void TeamWidget::enableContent(bool enable)
{
    m_btnOpen->setEnabled(enable);
    m_btnEntryPoint->setEnabled(enable);
    m_btnReload->blockSignals(!enable);
    m_reloadAction->setEnabled(enable);
    m_btnEnableDebug->setEnabled(enable && m_type != amun::StatusStrategyWrapper::AUTOREF);
    m_debugAction->setEnabled(enable);
    m_performanceAction->setEnabled(enable);
    m_contentEnabled = enable;
}

void TeamWidget::load()
{
    QSettings s;
    s.beginGroup(teamTypeName());

    const auto previousFilename = s.value("Script").toString();
    if (previousFilename != "") {
        m_filename = previousFilename;
    } else if (m_recentScripts != nullptr) {
#ifdef EASY_MODE
        const auto tsInitRegex = QRegularExpression(".*.ts");
        const QStringList typescriptStrategies = m_recentScripts->filter(tsInitRegex);
        if (typescriptStrategies.length() > 0) {
            m_filename = typescriptStrategies.first();
        }
#endif
    }

    m_entryPoint = s.value("EntryPoint").toString();
    m_reloadAction->setChecked(s.value("AutoReload").toBool());
    m_performanceAction->setChecked(s.value("PerformanceMode", true).toBool());
    if (m_type != amun::StatusStrategyWrapper::AUTOREF) {
        m_btnEnableDebug->setChecked(s.value("EnableDebug", false).toBool());
    }
    s.endGroup();

    if (QFileInfo::exists(m_filename)) {
        selectEntryPoint(m_entryPoint);
    }
}

void TeamWidget::setRecentScripts(std::shared_ptr<QStringList> recent)
{
    // both teamwidgets share the same string list
    // changes to the list are handled by prepareScriptMenu
    m_recentScripts = recent;
}

void TeamWidget::forceAutoReload(bool force)
{
    // must be updated before call to setChecked!
    m_reloadAction->setDisabled(force); // disable when forced
    if (force) {
        m_reloadAction->setChecked(true);
    } else {
        m_reloadAction->setChecked(m_userAutoReload);
    }
}

void TeamWidget::handleStatus(const Status &status)
{
    if (!m_contentEnabled) {
        return;
    }
    // select corresponding strategy status
    const amun::StatusStrategy *strategy = nullptr;
    if (status->has_status_strategy()) {
        const auto &statusStrategy = status->status_strategy();
        if (statusStrategy.type() == m_type) {
            strategy = &statusStrategy.status();
        }
    }

    if (strategy) {
        // only show entrypoint selection if > 0 entry points available
        m_btnEntryPoint->setVisible(strategy->entry_point_size() > 0);

        // rebuild entrypoint menu
        m_entryPoints->clear();
        for (int i = 0; i < strategy->entry_point_size(); i++) {
            const QString name = QString::fromStdString(strategy->entry_point(i));
            addEntryPoint(m_entryPoints, name, name);
        }

        // show entrypoint name
        if (strategy->has_current_entry_point()) {
            m_entryPoint = QString::fromStdString(strategy->current_entry_point());
            QString shortEntryPoint = shortenEntrypointName(m_entryPoints, m_entryPoint, 20);
            m_btnEntryPoint->setText(shortEntryPoint);
        } else {
            m_entryPoint = QString();
            m_btnEntryPoint->setText("<n/a>");
        }

        // strategy name
        m_btnOpen->setText(QString::fromStdString(strategy->name()));
        // status dependent display
        m_actionDisable->setVisible(strategy->state() != amun::StatusStrategy::CLOSED);

        m_compiling = false;
        switch (strategy->state()) {
        case amun::StatusStrategy::CLOSED:
            m_btnOpen->setText("Disabled");
            m_notification = false;
            // clear strategy information
            m_filename = QString();
            m_entryPoint = QString();
            break;

        case amun::StatusStrategy::RUNNING:
            m_notification = false;
            break;

        case amun::StatusStrategy::FAILED:
            m_notification = true;
            break;

        case amun::StatusStrategy::COMPILING:
            m_compiling = true;
            break;
        }

        // update debugger status
        m_debugAction->setEnabled(strategy->has_debugger());

        updateStyleSheet();
    }
}

void TeamWidget::enableDebugger(bool enable)
{
    m_debugAction->setVisible(enable);
}

void TeamWidget::addEntryPoint(QMenu *menu, const QString &name, const QString &entryPoint)
{
    int idx = name.indexOf("/");
    if (idx == -1) {
        QAction *action = menu->addAction(name);
        action->setData(entryPoint);
    } else {
        const QString nameLeft = name.left(idx);
        const QString nameRight = name.right(name.length() - idx - 1);
        QAction *action = NULL;
        const QList<QAction*> actions = menu->actions();
        if (!actions.isEmpty()) {
            action = actions.last();
        }

        QMenu *subMenu;
        if (action && action->text() == nameLeft) {
            subMenu = action->menu();
        } else {
            subMenu = menu->addMenu(nameLeft);
        }
        addEntryPoint(subMenu, nameRight, entryPoint);
    }
}

QString TeamWidget::shortenEntrypointName(const QMenu *menu, const QString &name, int targetLength)
{
    // shorten entry point name
    QString left = "";
    QString right = name;
    while (left.length() + 1 + right.length() > targetLength) {
        int idx = right.indexOf("/");
        if (idx == -1) {
            break;
        } else {
            const QString nameLeft = right.left(idx);
            const QString nameRight = right.right(right.length() - idx - 1);

            // strip as many characters as possible while staying nonambiguous
            int maxCommon = 0;
            const QMenu *nextMenu = nullptr;
            foreach(QAction *action, menu->actions()) {
                QString name = action->text();
                if (name == nameLeft) {
                    // must always be present once
                    nextMenu = action->menu();
                    continue;
                }
                for (int i = 0; i < name.length(); ++i) {
                    if (i >= nameLeft.length() || name.at(i) != nameLeft.at(i)) {
                        maxCommon = std::max(maxCommon, i);
                        break;
                    }
                }
            }
            Q_ASSERT(nextMenu != nullptr);
            // add one distinguishing characters
            left += ((left.isEmpty())?"" : "/") + nameLeft.left(maxCommon+1);
            right = nameRight;
            menu = nextMenu;
        }
    }
    return left + ((left.isEmpty())?"" : "/") + right;
}

void TeamWidget::showOpenDialog()
{
    QString filename = QFileDialog::getOpenFileName(this, "Open script", QString(), QString("Lua/Ts script entrypoint (init.lua init.ts)"));
    if (filename.isNull()) {
        return;
    }

    open(filename);
}

void TeamWidget::open()
{
    QString filename = sender()->property("filename").toString();
    if (filename.isNull()) {
        return;
    }

    open(filename);
}

amun::CommandStrategy * TeamWidget::commandStrategyFromType(const Command &command) const
{

    switch (m_type) {
    case amun::StatusStrategyWrapper::BLUE:
        return command->mutable_strategy_blue();
    case amun::StatusStrategyWrapper::YELLOW:
        return command->mutable_strategy_yellow();
    case amun::StatusStrategyWrapper::AUTOREF:
        return command->mutable_strategy_autoref();
    case amun::StatusStrategyWrapper::REPLAY_BLUE:
        return command->mutable_replay()->mutable_blue_strategy();
    case amun::StatusStrategyWrapper::REPLAY_YELLOW:
        return command->mutable_replay()->mutable_yellow_strategy();
    }
    return nullptr;
}

void TeamWidget::open(const QString &filename)
{
    m_filename = filename;

    if (m_recentScripts) {
        // move script to front
        m_recentScripts->removeAll(filename);
        m_recentScripts->prepend(filename);
        // keep at most five most recent scripts
        while (m_recentScripts->size() > 5) {
            m_recentScripts->takeLast();
        }
    }
    Command command(new amun::Command);
    amun::CommandStrategyLoad *strategy = commandStrategyFromType(command)->mutable_load();

    strategy->set_filename(filename.toStdString());
    emit sendCommand(command);
}

void TeamWidget::closeScript()
{
    Command command(new amun::Command);
    amun::CommandStrategy *strategy = commandStrategyFromType(command);

    strategy->mutable_close();
    emit sendCommand(command);
}

void TeamWidget::prepareScriptMenu()
{
    // only keep close and open... entries
    while (m_scriptMenu->actions().size() > 2) {
        m_scriptMenu->removeAction(m_scriptMenu->actions().last());
    }

    if (!m_recentScripts || m_recentScripts->isEmpty()) {
        return;
    }

    // add seperator and filenames
    m_scriptMenu->addSeparator();
    foreach (const QString &script, *m_recentScripts) {
        QAction *action = m_scriptMenu->addAction(script);
        action->setProperty("filename", script);
        connect(action, SIGNAL(triggered()), SLOT(open()));
    }
}

void TeamWidget::selectEntryPoint(const QString &entry_point)
{
    Command command(new amun::Command);
    amun::CommandStrategyLoad *strategy = commandStrategyFromType(command)->mutable_load();

    strategy->set_filename(m_filename.toStdString());
    strategy->set_entry_point(entry_point.toStdString());

    emit sendCommand(command);
}

void TeamWidget::selectEntryPoint(QAction* action)
{
    selectEntryPoint(action->data().toString());
}

void TeamWidget::sendReload()
{
    Command command(new amun::Command);
    amun::CommandStrategy *strategy = commandStrategyFromType(command);

    strategy->set_reload(true);
    emit sendCommand(command);
}

void TeamWidget::sendAutoReload()
{
    if (m_reloadAction->isEnabled()) {
        m_userAutoReload = m_reloadAction->isChecked();
    }
    Command command(new amun::Command);
    amun::CommandStrategy *strategy = commandStrategyFromType(command);

    strategy->set_auto_reload(m_reloadAction->isChecked());
    emit sendCommand(command);
}

void TeamWidget::sendEnableDebug(bool enable)
{
    Command command(new amun::Command);
    amun::CommandStrategy *strategy = commandStrategyFromType(command);

    strategy->set_enable_debug(enable);
    emit sendCommand(command);
}

void TeamWidget::sendTriggerDebug()
{
    Command command(new amun::Command);
    amun::CommandStrategy *strategy = commandStrategyFromType(command);

    strategy->mutable_debug();
    emit sendCommand(command);
}

void TeamWidget::sendPerformanceDebug(bool enable)
{
    Command command(new amun::Command);
    amun::CommandStrategy *strategy = commandStrategyFromType(command);

    strategy->set_performance_mode(enable);
    emit sendCommand(command);
}

void TeamWidget::updateStyleSheet()
{
    // update background and border color
    QColor color;
    switch (m_type) {
    case amun::StatusStrategyWrapper::BLUE:
    case amun::StatusStrategyWrapper::REPLAY_BLUE:
        color = m_useDarkColors ? UI_BLUE_COLOR_DARK : UI_BLUE_COLOR_LIGHT;
        break;
    case amun::StatusStrategyWrapper::YELLOW:
    case amun::StatusStrategyWrapper::REPLAY_YELLOW:
        color = m_useDarkColors ? UI_YELLOW_COLOR_DARK : UI_YELLOW_COLOR_LIGHT;
        break;
    case amun::StatusStrategyWrapper::AUTOREF:
        color = m_useDarkColors ? UI_AUTOREF_COLOR_DARK : UI_AUTOREF_COLOR_LIGHT;
        break;
    }
    const QColor bgColor = m_notification ? "red" : (m_compiling ? "gray" : color.lighter(170));

    QString ss("TeamWidget { background-color: %2; border: 1px solid %1; border-radius: 5px; }");
    setStyleSheet(ss.arg(color.name()).arg(bgColor.name()));
}
