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

#include "debugtreewidget.h"
#include "debugmodel.h"
#include "guihelper/guitimer.h"

#include <QSettings>
#include <QHeaderView>
#include <QStyledItemDelegate>
#include <QLineEdit>

class NoEditItemDelegate : public QStyledItemDelegate
{
public:
    NoEditItemDelegate(QWidget *parent) : QStyledItemDelegate(parent) {}
    QWidget* createEditor(QWidget *, const QStyleOptionViewItem &, const QModelIndex &index) const override;
};

QWidget *NoEditItemDelegate::createEditor(QWidget *parent, const QStyleOptionViewItem &, const QModelIndex &index) const
{
    QLineEdit *edit = new QLineEdit(parent);
    edit->setText(index.data().toString());
    edit->setReadOnly(true);
    return edit;
}

DebugTreeWidget::DebugTreeWidget(QWidget *parent) :
    QTreeView(parent)
{
    m_modelTree = new DebugModel(this);
    setUniformRowHeights(true); // big performance win
    setModel(m_modelTree);
    setItemDelegate(new NoEditItemDelegate(this));

    expandAll();
    connect(this, SIGNAL(expanded(QModelIndex)), SLOT(debugExpanded(QModelIndex)));
    connect(this, SIGNAL(collapsed(QModelIndex)), SLOT(debugCollapsed(QModelIndex)));
    connect(m_modelTree, SIGNAL(expand(QModelIndex)), this, SLOT(expand(QModelIndex)));

    // should be fast enough to be barely noticeable
    m_guiTimer = new GuiTimer(50, this);
    connect(m_guiTimer, &GuiTimer::timeout, this, &DebugTreeWidget::updateTree);;

    load();
}

DebugTreeWidget::~DebugTreeWidget()
{
    QSettings s;
    s.setValue("Debug/TreeHeader", header()->saveState());
}

void DebugTreeWidget::checkBreak()
{
    if (m_breakOnItem && m_modelTree->hasItems()) {
        emit triggerBreak();
    }
}

void DebugTreeWidget::setFilterRegEx(const QString &keyFilter, const QString &valueFilter)
{
    m_modelTree->setFilterRegEx(keyFilter, valueFilter);
    m_modelTree->clearData();
    // publish last statuses again for filtering
    for (const Status &status: m_lastStatus) {
        for (const auto& debug: status->debug()) {
            m_modelTree->setDebugIfCurrent(debug, m_expanded);
        }
    }
    checkBreak();
}

void DebugTreeWidget::handleStatus(const Status &status)
{
    for (const auto& debug : status->debug()) {
        // save data for delayed update
        m_status[debug.source()] = status;
        m_guiTimer->requestTriggering();

        // save data for use in filtering
        m_lastStatus[debug.source()] = status;
    }
}

void DebugTreeWidget::updateTree()
{
    // publish all cached data
    for (const auto& status: m_status) {
        for (const auto& debug: status->debug()) {
            m_modelTree->setDebug(debug, m_expanded);
        }
    }
    checkBreak();

    // don't show it a second time
    m_status.clear();
}

void DebugTreeWidget::clearData()
{
#ifdef Q_OS_MAC
    // workaround for crash with OS X Accessibility
    // see https://blog.inventic.eu/2015/05/crash-in-qtreewidget-qtreeview-index-mapping-on-mac-osx-10-10-part-iii/
    selectionModel()->clear();
#endif
    m_modelTree->clearData();
}

void DebugTreeWidget::load()
{
    QSettings s;
    header()->restoreState(s.value("Debug/TreeHeader").toByteArray());
    m_expanded = s.value("Debug/Expanded").toStringList().toSet();
}

void DebugTreeWidget::save()
{
    QSettings s;
    s.setValue("Debug/Expanded", QStringList(QStringList::fromSet(m_expanded)));
}

void DebugTreeWidget::debugExpanded(const QModelIndex &index)
{
    const QString name = index.data(Qt::UserRole + 1).toString();
    if (!m_expanded.contains(name)) {
        m_expanded.insert(name);
        save();
    }
}

void DebugTreeWidget::debugCollapsed(const QModelIndex &index)
{
    const QString name = index.data(Qt::UserRole + 1).toString();
    if (m_expanded.remove(name)) {
        save();
    }
}
