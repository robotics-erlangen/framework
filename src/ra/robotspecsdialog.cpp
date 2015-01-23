/***************************************************************************
 *   Copyright 2015 Michael Bleier, Philipp Nordhus                        *
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

#include "robotselectionwidget.h"
#include "robotspecsdialog.h"
#include "ui_robotspecsdialog.h"
#include <google/protobuf/descriptor.h>
#include <QDoubleSpinBox>
#include <QSettings>
#include <QStyledItemDelegate>
#include <limits>

static const int DATA_MESSAGE = Qt::UserRole + 1;
static const int DATA_FIELD = Qt::UserRole + 2;

Q_DECLARE_METATYPE(const google::protobuf::FieldDescriptor*)
Q_DECLARE_METATYPE(google::protobuf::Message*)

class SpinBoxDelegate : public QStyledItemDelegate
{
public:
    SpinBoxDelegate(QObject* parent): QStyledItemDelegate(parent) {
    }

public:
    QWidget* createEditor(QWidget* parent, const QStyleOptionViewItem& option, const QModelIndex& index ) const {
        if (index.data(Qt::EditRole).type() == QVariant::Double) {
            QDoubleSpinBox* editor = new QDoubleSpinBox(parent);
            editor->setRange(-std::numeric_limits<double>::max(), std::numeric_limits<double>::max());
            editor->setDecimals(6);
            return editor;
        }

        return QStyledItemDelegate::createEditor(parent, option, index);
    }
};

RobotSpecsDialog::RobotSpecsDialog(const robot::Specs &specs, const robot::Specs &def, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::RobotSpecsDialog),
    m_specs(specs),
    m_robot(true)
{
    init(&def);
}

RobotSpecsDialog::RobotSpecsDialog(const robot::Specs &specs, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::RobotSpecsDialog),
    m_specs(specs),
    m_robot(false)
{
    init(NULL);
}

RobotSpecsDialog::~RobotSpecsDialog()
{
    QSettings s;
    s.beginGroup("RobotSpecs");
    s.setValue("Size", size());
    s.setValue("TreeHeader", ui->tree->header()->saveState());
    s.endGroup();

    delete ui;
}

void RobotSpecsDialog::itemChanged(QStandardItem *item)
{
    const QVariant value = item->data(Qt::EditRole);
    const google::protobuf::FieldDescriptor *field = item->data(DATA_FIELD).value<const google::protobuf::FieldDescriptor*>();
    google::protobuf::Message *message = item->data(DATA_MESSAGE).value<google::protobuf::Message*>();
    const google::protobuf::Reflection *refl = message->GetReflection();
    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        refl->SetBool(message, field, value.toBool());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        refl->SetFloat(message, field, value.toDouble());
        break;

    default:
        break;
    }

    if (m_robot) {
        QFont font;
        font.setBold(true);
        item->setFont(font);
    }
}

void RobotSpecsDialog::init(const robot::Specs *def)
{
    ui->setupUi(this);

    m_model = new QStandardItemModel(this);
    m_model->setHorizontalHeaderLabels(QStringList() << "Name" << "Value");
    ui->tree->setModel(m_model);
    SpinBoxDelegate* delegate = new SpinBoxDelegate(this);
    ui->tree->setItemDelegate(delegate);
    if (def) {
        ui->label->setText(QString("Generation %1 - Robot %2").arg(def->year()).arg(m_specs.id()));
    } else {
        ui->label->setText(QString("Generation %1").arg(m_specs.year()));
    }

    fillTree(m_model->invisibleRootItem(), &m_specs, def);
    ui->tree->expandAll();

    QSettings s;
    s.beginGroup("RobotSpecs");
    if (!s.value("Size").isNull()) {
        resize(s.value("Size").toSize());
    }
    ui->tree->header()->restoreState(s.value("TreeHeader").toByteArray());
    s.endGroup();

    connect(m_model, SIGNAL(itemChanged(QStandardItem*)), SLOT(itemChanged(QStandardItem*)));
}

void RobotSpecsDialog::fillTree(QStandardItem *parent, google::protobuf::Message *specs, const google::protobuf::Message *def)
{
    const google::protobuf::Descriptor *desc = specs->GetDescriptor();
    const google::protobuf::Reflection *refl = specs->GetReflection();
    for (int i = 0; i < desc->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = desc->field(i);

        if (field->cpp_type() == field->CPPTYPE_BOOL || field->cpp_type() == field->CPPTYPE_FLOAT) {
            QStandardItem *key_item = new QStandardItem(QString::fromStdString(field->camelcase_name()));
            key_item->setEditable(false);

            QStandardItem *value_item = new QStandardItem;
            value_item->setData(qVariantFromValue(field), DATA_FIELD);
            value_item->setData(qVariantFromValue(specs), DATA_MESSAGE);

            if (def && !refl->HasField(*specs, field)) {
                value_item->setData(getData(*def, field), Qt::EditRole);
            } else {
                value_item->setData(getData(*specs, field), Qt::EditRole);
                if (def) {
                    QFont font;
                    font.setBold(true);
                    value_item->setFont(font);
                }
            }

            parent->appendRow(QList<QStandardItem*>() << key_item << value_item);
        }

        if (field->cpp_type() == field->CPPTYPE_MESSAGE) {
            QStandardItem *key_item = new QStandardItem(QString::fromStdString(field->camelcase_name()));
            key_item->setEditable(false);
            parent->appendRow(QList<QStandardItem*>() << key_item);
            if (def) {
                fillTree(key_item, refl->MutableMessage(specs, field), &refl->GetMessage(*def, field));
            } else {
                fillTree(key_item, refl->MutableMessage(specs, field), NULL);
            }
        }
    }
}

QVariant RobotSpecsDialog::getData(const google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    QVariant data;

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        data = message.GetReflection()->GetBool(message, field);
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        data = (double) message.GetReflection()->GetFloat(message, field);
        break;

    default:
        break;
    }

    return data;
}
