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

#ifndef DEBUGMODEL_H
#define DEBUGMODEL_H

#include "protobuf/status.pb.h"
#include <QStandardItemModel>
#include <QRegularExpression>

class DebugModel : public QStandardItemModel
{
    Q_OBJECT

public:
    explicit DebugModel(QObject *parent = 0);
    ~DebugModel() override;
    DebugModel(const DebugModel&) = delete;
    DebugModel& operator=(const DebugModel&) = delete;

signals:
    void expand(const QModelIndex &index);

public:
    void clearData();
    void setDebugIfCurrent(const amun::DebugValues &debug, const QSet<QString> &debug_expanded);
    void setDebug(const amun::DebugValues &debug, const QSet<QString> &debug_expanded, bool content = true);
    void setFilterRegEx(const QString &filterKey, const QString &filterValue);
    bool hasItems() const;

private:
    void addRootItem(const QString &name, int sourceId);
    class Entry;
    typedef QHash<QString, Entry*> Map;
    void testMap(Map &map, const QSet<Entry*> &entries, bool parentMatched);

private:
    QHash<int, QStandardItem*> m_itemRoots;
    QHash<int, int> m_debugSourceCounter;
    Map m_entryMap;
    QHash<int, Map> m_debug;
    bool m_filterKey, m_filterValue;
    QRegularExpression m_filterKeyExpression;
    QRegularExpression m_filterValueExpression;

    const int DEBUG_SOURCE_TIMEOUT = 50;
};

#endif // DEBUGMODEL_H
