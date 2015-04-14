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

#include "visualizationwidget.h"
#include "ui_visualizationwidget.h"
#include <QMenu>
#include <QSettings>
#include <QSortFilterProxyModel>
#include <QStandardItemModel>
#include <QTimer>

VisualizationWidget::VisualizationWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::VisualizationWidget)
{
    ui->setupUi(this);

    // create item model
    m_model = new QStandardItemModel(this);
    ui->list->setUniformItemSizes(true); // speed up
    ui->list->setModel(m_model);
    connect(m_model, SIGNAL(itemChanged(QStandardItem*)), SLOT(itemChanged(QStandardItem*)));

    // setup context menu
    m_contextMenu = new QMenu(this);
    QAction *actionClear = new QAction("Clear visualizations", m_contextMenu);
    connect(actionClear, SIGNAL(triggered()), this, SLOT(clearItems()));
    m_contextMenu->addAction(actionClear);

    ui->list->setContextMenuPolicy(Qt::CustomContextMenu);
    connect(ui->list, SIGNAL(customContextMenuRequested(QPoint)), this, SLOT(showContextMenu(QPoint)));

    // setup invalidate timer
    QTimer *timer = new QTimer(this);
    connect(timer, SIGNAL(timeout()), SLOT(invalidateItems()));
    timer->start(100);
}

VisualizationWidget::~VisualizationWidget()
{
    QSettings s;
    s.beginGroup("Visualization");
    s.setValue("Visible", QStringList(m_selection.toList()));
    s.endGroup();

    delete ui;
}

void VisualizationWidget::load()
{
    QSettings s;
    s.beginGroup("Visualization");
    m_items.clear();
    // load previously selected items and create entries for them
    foreach (const QString &s, s.value("Visible").toStringList()) {
        QByteArray b = s.toUtf8();
        if (!m_items.contains(b)) {
            QStandardItem *item = new QStandardItem(s);
            item->setCheckable(true);
            item->setCheckState(Qt::Checked);
            item->setForeground(Qt::gray);
            m_items[b] = qMakePair(item, (qint64)0);
            m_selection.insert(s); // block sendItemsChanged
            m_model->appendRow(item);
        }
    }
    s.endGroup();

    // just sort the model afterwards
    m_model->sort(0);

    sendItemsChanged();
}

void VisualizationWidget::showContextMenu(const QPoint &pos)
{
    m_contextMenu->popup(ui->list->mapToGlobal(pos));
}

void VisualizationWidget::handleStatus(Status status)
{
    if (status->has_debug()) {
        const amun::DebugValues &values = status->debug();
        m_time = status->time();

        for (int i = 0; i < values.visualization_size(); i++) {
            const amun::Visualization &vis = values.visualization(i);
            // avoid conversion to QString if not really neccessary
            const std::string &stdName = vis.name();
            const QByteArray name(stdName.data(), stdName.size());

            QPair<QStandardItem*, qint64> &entry = m_items[name];
            QStandardItem *&item = entry.first;
            // add item if neccessary
            if (item == NULL) {
                item = new QStandardItem(QString::fromStdString(vis.name()));
                item->setCheckable(true);
                item->setCheckState(Qt::Unchecked);
                entry = qMakePair(item, m_time);
                m_model->appendRow(item);
                // new visualizations are rarely added, just sort everything
                m_model->sort(0);
            }

            // mark as visible
            entry.second = m_time;
            clearForeground(item);
        }
    }
}

void VisualizationWidget::clearForeground(QStandardItem *item) const
{
    // only clear foreground if it's set, causes a serious performance regression in the plotter
    // if it's always done, thus do it the same way here
    if (item->data(Qt::ForegroundRole).isValid()) {
        item->setData(QVariant(), Qt::ForegroundRole); // clear foreground color
    }
}

void VisualizationWidget::clearItems()
{
    // clear everything and broadcast the empty selection
    m_model->clear();
    m_items.clear();
    m_selection.clear();
    sendItemsChanged();
}

void VisualizationWidget::invalidateItems()
{
    foreach (const HashMap::mapped_type &p, m_items) {
        // entries that havn't been updated for 0.5s are greyed out
        if (m_time - p.second > 0.5E9) {
            QStandardItem *item = p.first;
            // only update color if neccessary
            if (!item->data(Qt::ForegroundRole).isValid()) {
                item->setForeground(Qt::gray);
            }
        }
    }
}

void VisualizationWidget::sendItemsChanged()
{
    emit itemsChanged(QStringList(m_selection.toList()));
}

void VisualizationWidget::itemChanged(QStandardItem *item)
{
    bool changed = false;
    const QString name = item->text();
    // update selection
    if (item->checkState() == Qt::Checked) {
        if (!m_selection.contains(name)) {
            m_selection.insert(name);
            changed = true;
        }
    } else {
        if (m_selection.remove(name)) {
            changed = true;
        }
    }

    if (changed) {
        sendItemsChanged();
    }
}
