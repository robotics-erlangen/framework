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

#include "debugmodel.h"
#include <QSet>
#include <QStringBuilder>

class DebugModel::Entry {
public:
    Entry(const QString &key, const QString &id) : id(id) {
        name = new QStandardItem(key);
        name->setData(id);
        value = new QStandardItem;
    }

    QStandardItem *name;
    const QString id;
    QStandardItem *value;
    DebugModel::Map children;
};

DebugModel::DebugModel(QObject *parent) :
    QStandardItemModel(parent)
{
    setHorizontalHeaderLabels(QStringList() << "Name" << "Value");

    addRootItem("Team Blue", amun::StrategyBlue);
    addRootItem("Team Yellow", amun::StrategyYellow);
    addRootItem("Autoref", amun::Autoref);
    addRootItem("Tracking", amun::Tracking);
}

DebugModel::~DebugModel() {
    qDeleteAll(m_entryMap);
}

void DebugModel::addRootItem(const QString &name, int sourceId)
{
    Q_ASSERT(m_itemRoots[sourceId] == nullptr);

    QStandardItem *item = new QStandardItem(name);
    appendRow(item);
    m_itemRoots[sourceId] = item;
}

void DebugModel::clearData()
{
    for (int sourceId: m_itemRoots.keys()) {
        amun::DebugValues debug;
        debug.set_source((amun::DebugSource)sourceId);
        setDebug(debug, QSet<QString>());
    }
}

void DebugModel::setDebug(const amun::DebugValues &debug, const QSet<QString> &debug_expanded)
{
    m_debugSourceCounter[debug.source()] = 0;
    for (auto it = m_debugSourceCounter.begin(); it != m_debugSourceCounter.end(); it++) {
        // don't try to clear multiple times
        if (it.value() >= 0) {
            it.value()++;
        }
        if (it.value() > 50) {
            it.value() = -1;
            amun::DebugValues debug;
            debug.set_source((amun::DebugSource)it.key());
            setDebug(debug, QSet<QString>());
        }
    }

    Map &map = m_debug[debug.source()];

    QStandardItem *parentItem = m_itemRoots.value(debug.source());
    if (parentItem == nullptr) {
        return;
    }

    QSet<Entry*> entries;

    for (int i = 0; i < debug.value_size(); i++) {
        const amun::DebugValue &value = debug.value(i);

        QString v; // convert to string
        if (value.has_bool_value()) {
            v = QVariant(value.bool_value()).toString();
        } else if (value.has_float_value()) {
            v = QString::number(value.float_value());
        } else if (value.has_string_value()) {
            v = QString::fromStdString(value.string_value());
        }

        // strategy specific key
        const QString keys = parentItem->text() % "/" % QString::fromStdString(value.key());
        Entry *entry = m_entryMap.value(keys, NULL);
        // key not cached yet
        if (entry == NULL) {
            // split key and create all parent items
            QStringList key = keys.split("/", QString::SkipEmptyParts);

            QStandardItem *parent = parentItem;
            QString name = key.takeFirst();

            Map *m = &map;
            foreach (const QString &k, key) {
                name = name % "/" % k;

                entry = m->value(k, NULL);
                if (entry == NULL) {
                    // allocate manually to allow using a lookup table
                    entry = new Entry(k, name);
                    (*m)[k] = entry; // add to tree
                    m_entryMap[name] = entry; // add to map
                    parent->appendRow(QList<QStandardItem*>() << entry->name << entry->value);

                    if (debug_expanded.contains(name)) {
                        emit expand(entry->name->index());
                    }
                }

                parent = entry->name;
                m = &entry->children;
            }
        }

        // prevent crash on invalid key
        if (entry != NULL) {
            entries.insert(entry); // entry is valid
            entry->value->setText(v); // already checks whether the value is changed
        }
    }
    // remove outdated items
    testMap(map, entries);
}

void DebugModel::testMap(DebugModel::Map &map, const QSet<Entry*> &entries)
{
    QMutableHashIterator<QString, Entry*> it(map);
    while (it.hasNext()) {
        it.next();

        // cleanup when unwinding recursion
        Entry *entry = it.value();
        testMap(entry->children, entries);
        if (!entries.contains(entry)) {
            if (entry->children.size() == 0) {
                // remove unneccessary leaves
                // a entry is only removed if all its children have been removed before
                // thus m_entryMap cannot contain outdated values
                QStandardItem *item = entry->name;
                QStandardItem *parent = item->parent();
                // remove and delete
                parent->removeRows(item->row(), 1);
                it.remove();
                m_entryMap.remove(entry->id);
                delete entry;
            } else {
                entry->value->setText("");
            }
        }
    }
}
