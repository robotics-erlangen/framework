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

#include "timingwidget.h"
#include "ui_timingwidget.h"
#include <QSettings>
#include <QTimer>
#include <google/protobuf/descriptor.h>

TimingWidget::TimingWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::TimingWidget)
{
    ui->setupUi(this);

    m_model = new QStandardItemModel(this);
    m_model->setHorizontalHeaderLabels(QStringList() << "Component" << "Max time" << "FPS");
    ui->treeView->setUniformRowHeights(true); // speedup
    ui->treeView->setModel(m_model);

    // create entries by introspection
    const google::protobuf::Descriptor *desc = amun::Timing::descriptor();
    for (int i = 0; i < desc->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = desc->field(i);
        QStandardItem *key = new QStandardItem(QString::fromStdString(field->name()));
        QStandardItem *time = new QStandardItem;
        time->setTextAlignment(Qt::AlignRight);
        QStandardItem *frequency = new QStandardItem;
        frequency->setTextAlignment(Qt::AlignRight);
        // add row
        m_model->appendRow(QList<QStandardItem*>() << key << time << frequency);
    }

    QTimer *timer = new QTimer(this); // update view once every second
    connect(timer, SIGNAL(timeout()), SLOT(updateModel()));
    timer->start(1000);
    updateModel(); // initial update

    QSettings s; // remember column sizes
    s.beginGroup("Timing");
    ui->treeView->header()->restoreState(s.value("Header").toByteArray());
    s.endGroup();
}

TimingWidget::~TimingWidget()
{
    saveConfig();
    delete ui;
}

void TimingWidget::saveConfig()
{
    QSettings s;
    s.beginGroup("Timing");
    s.setValue("Header", ui->treeView->header()->saveState());
    s.endGroup();
}

void TimingWidget::handleStatus(const Status &status)
{
    if (status->has_timing()) {
        const amun::Timing &t = status->timing();
        const google::protobuf::Reflection *refl = t.GetReflection();
        const google::protobuf::Descriptor *desc = amun::Timing::descriptor();
        // extract fields using reflection
        for (int i = 0; i < desc->field_count(); i++) {
            const google::protobuf::FieldDescriptor *field = desc->field(i);
            if (refl->HasField(t, field)) {
                Value &value = m_values[i];
                value.iterations++;
                value.time = qMax(value.time, refl->GetFloat(t, field));
            }
        }
    }
}

void TimingWidget::updateModel()
{
    for (int i = 0; i < m_model->rowCount(); i++) {
        const Value value = m_values.take(i); // remove value
        QString text;

        text = QString::number(value.time * 1E3, 'f', 3); // time in ms
        m_model->item(i, 1)->setText(text);

        text = QString::number(value.iterations);
        m_model->item(i, 2)->setText(text);
    }
}
