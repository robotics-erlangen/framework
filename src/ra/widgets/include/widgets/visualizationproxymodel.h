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

#ifndef VISUALIZATIONPROXYMODEL_H
#define VISUALIZATIONPROXYMODEL_H

#include <QSortFilterProxyModel>

class QStandardItem;

class VisualizationProxyModel : public QSortFilterProxyModel
{
    Q_OBJECT

public:
    VisualizationProxyModel(QObject *parent = 0);
    void setLastChangedItem(QStandardItem * item);
    void setSortByChecked(bool sort) { m_sortByChecked = sort; }

protected:
    bool lessThan(const QModelIndex &left, const QModelIndex &right) const Q_DECL_OVERRIDE;

private:
    QStandardItem * m_lastChangedItem = nullptr;
    bool m_sortByChecked = true;
};

#endif // VISUALIZATIONPROXYMODEL_H
