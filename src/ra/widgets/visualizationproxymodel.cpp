/***************************************************************************
 *   Copyright 2017 Andreas Wendler                                        *
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

#include "visualizationproxymodel.h"

#include <QStandardItem>
#include <QStandardItemModel>

VisualizationProxyModel::VisualizationProxyModel(QObject *parent)
    : QSortFilterProxyModel(parent)
{ }

void VisualizationProxyModel::setLastChangedItem(QStandardItem * item)
{
    m_lastChangedItem = item;
}

bool VisualizationProxyModel::lessThan(const QModelIndex &left, const QModelIndex &right) const
{
    QStandardItemModel * source = (QStandardItemModel*)sourceModel();
    QStandardItem * leftItem = source->itemFromIndex(left);
    QStandardItem * rightItem = source->itemFromIndex(right);

    if (m_sortByChecked && ((leftItem->checkState() == Qt::Checked || leftItem == m_lastChangedItem) !=
            (rightItem->checkState() == Qt::Checked || rightItem == m_lastChangedItem))) {
        return leftItem->checkState() == Qt::Checked || leftItem == m_lastChangedItem;
    } else {
        return QString::localeAwareCompare(leftItem->text(), rightItem->text()) < 0;
    }
}
