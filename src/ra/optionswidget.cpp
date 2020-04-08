/***************************************************************************
 *   Copyright 2016 Michael Eischer                                        *
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

#include "optionswidget.h"
#include "ui_optionswidget.h"
#include <QSortFilterProxyModel>
#include <QStandardItemModel>

OptionsWidget::OptionsWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::OptionsWidget)
{
    ui->setupUi(this);

    // create item model
    m_model = new QStandardItemModel(this);
    ui->list->setUniformItemSizes(true); // speed up
    ui->list->setModel(m_model);
    connect(m_model, SIGNAL(itemChanged(QStandardItem*)), SLOT(itemChanged(QStandardItem*)));
}

OptionsWidget::~OptionsWidget()
{
    delete ui;
}

void OptionsWidget::handleAmunState(const amun::StatusAmun &strategy)
{
    for (const auto &option: strategy.options()) {
        // avoid conversion to QString if not really neccessary
        const QByteArray optionName(option.name().data(), option.name().size());

        QStandardItem *&item = m_items[optionName];
        // add item if neccessary
        if (item == NULL) {
            item = new QStandardItem(QString::fromStdString(option.name()));
            item->setCheckable(true);
            if (option.value()) {
                m_selection.insert(item->text());
            }
            item->setCheckState(option.value() ? Qt::Checked : Qt::Unchecked);
            m_model->appendRow(item);
            // new options are rarely added, just sort everything
            m_model->sort(0);
        }
    }
}

void OptionsWidget::handleStatus(const Status &status)
{
    if (status->has_amun_state()) {
        handleAmunState(status->amun_state());
    }
}

void OptionsWidget::sendItemChanged(const QString &name, bool value)
{
    Command command(new amun::Command);

    auto *optionChange = command->mutable_amun()->mutable_change_option();
    optionChange->set_name(name.toStdString());
    optionChange->set_value(value);

    emit sendCommand(command);
}

void OptionsWidget::itemChanged(QStandardItem *item)
{
    const QString name = item->text();
    // update selection
    if (item->checkState() == Qt::Checked) {
        if (!m_selection.contains(name)) {
            m_selection.insert(name);
            sendItemChanged(name, true);
        }
    } else {
        if (m_selection.remove(name)) {
            sendItemChanged(name, false);
        }
    }
}
