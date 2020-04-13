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

#ifndef VISUALIZATIONWIDGET_H
#define VISUALIZATIONWIDGET_H

#include "protobuf/status.h"
#include <QHash>
#include <QSet>
#include <QWidget>

class QMenu;
class QStandardItem;
class QStandardItemModel;
class GuiTimer;
class VisualizationProxyModel;

namespace Ui {
class VisualizationWidget;
}

class VisualizationWidget : public QWidget
{
    Q_OBJECT

public:
    explicit VisualizationWidget(QWidget *parent = 0);
    ~VisualizationWidget() override;
    VisualizationWidget(const VisualizationWidget&) = delete;
    VisualizationWidget& operator=(const VisualizationWidget&) = delete;

signals:
    void itemsChanged(const QStringList &items);

public slots:
    void handleStatus(const Status &status);

public:
    void load();

private slots:
    void sendItemsChanged();
    void itemChanged(QStandardItem *item);
    void invalidateItems();
    void clearItems();
    void showContextMenu(const QPoint &pos);
    void saveConfig();
    void filterTextChanged(QString text);
    void enableFilteredVisualizations(bool enable);
    void toggleVisualization(QString filterRegex);

private:
    void clearForeground(QStandardItem *item) const;
    void addItem(const std::string &stdName, bool checked);

private:
    typedef QHash<QByteArray, QPair<QStandardItem*, qint64> > HashMap;
    Ui::VisualizationWidget *ui;
    QStandardItemModel *m_model;
    VisualizationProxyModel *m_proxy;
    QSet<QString> m_selection;
    HashMap m_items;
    qint64 m_time;
    QMenu *m_contextMenu;
    GuiTimer *m_guiTimer;
};

#endif // VISUALIZATIONWIDGET_H
