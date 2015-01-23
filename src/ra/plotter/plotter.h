/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#ifndef PLOTTER_H
#define PLOTTER_H

#include "protobuf/status.h"
#include "protobuf/world.pb.h"
#include <QDialog>
#include <QSet>
#include <QStandardItemModel>

class Plot;
class QMenu;
namespace Ui {
    class Plotter;
}

class Plotter : public QDialog
{
    Q_OBJECT

public:
    explicit Plotter(QWidget *parent = 0);
    ~Plotter();

public slots:
    void handleStatus(const Status &status);
    void clearData();

signals:
    void addPlot(const Plot *plot);
    void removePlot(const Plot *plot);

protected:
    void closeEvent(QCloseEvent *event);

private slots:
    void updateScrollBar();
    void updateOffset(int pos);

    void setFreeze(bool freeze);
    void plotContextMenu(const QPoint &pos);
    void clearSelection();
    void itemChanged(QStandardItem *item);
    void invalidatePlots();

private:
    void loadSelection();
    QStandardItem* getItem(const QString &name);
    void addRootItem(const QString &name, const QString &displayName);
    void parseMessage(const google::protobuf::Message &message, const QString &parent, float time);
    void addPoint(const QString &name, const QString &parent, float time, float value);
    void tryAddLength(const QString &name, const QString &parent, float time, float value1, float value2);

private:
    enum ItemRole {
        PlotRole = Qt::UserRole + 2,
        FullNameRole,
        FreezePlotRole
    };

    Ui::Plotter *ui;
    qint64 m_startTime;
    qint64 m_time;
    double m_timeLimit;
    bool m_freeze;
    QHash<QString, QStandardItem*> m_items;
    QSet<QString> m_selection;
    QStandardItemModel m_model;
    QMenu *m_plotMenu;
};

#endif // PLOTTER_H
