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

#ifndef DEBUGTREEWIDGET_H
#define DEBUGTREEWIDGET_H

#include <QTreeView>
#include <QHash>
#include "protobuf/status.h"

class DebugModel;
class GuiTimer;

class DebugTreeWidget : public QTreeView
{
    Q_OBJECT
public:
    explicit DebugTreeWidget(QWidget *parent = 0);
    ~DebugTreeWidget() override;
    DebugTreeWidget(const DebugTreeWidget&) = delete;
    DebugTreeWidget& operator=(const DebugTreeWidget&) = delete;
    void setFilterRegEx(const QString &keyFilter, const QString &valueFilter);
    void setBreakOnItem(bool b) { m_breakOnItem = b; }

public slots:
    void clearData();
    void handleStatus(const Status &status);

private slots:
    void updateTree();
    void debugExpanded(const QModelIndex &index);
    void debugCollapsed(const QModelIndex &index);

signals:
    void triggerBreak();

private:
    void load();
    void save();
    void checkBreak();

    DebugModel *m_modelTree;
    QTreeView *m_treeView;
    QSet<QString> m_expanded;
    QHash<int, Status> m_status;
    QHash<int, Status> m_lastStatus;
    GuiTimer *m_guiTimer;
    bool m_breakOnItem = false;
};

#endif // DEBUGTREEWIDGET_H
