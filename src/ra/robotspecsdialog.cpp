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

#include "resettableitemdelegate.h"
#include "robotselectionwidget.h"
#include "robotspecsdialog.h"
#include "ui_robotspecsdialog.h"
#include <QDoubleSpinBox>
#include <QItemEditorFactory>
#include <QSettings>
#include <QStandardItemModel>
#include <google/protobuf/descriptor.h>
#include <limits>

static const int DATA_MESSAGE = Qt::UserRole + 1;
static const int DATA_FIELD = Qt::UserRole + 2;
static const int DATA_DEFAULT = Qt::UserRole + 3;
static const int DATA_HAS_DEFAULT = Qt::UserRole + 4;

Q_DECLARE_METATYPE(const google::protobuf::FieldDescriptor*)
Q_DECLARE_METATYPE(google::protobuf::Message*)

class DoubleEditorCreator : public QItemEditorCreatorBase
{
public:
    QWidget *createWidget(QWidget *parent) const {
        QDoubleSpinBox *editor = new QDoubleSpinBox(parent);
        editor->setRange(-std::numeric_limits<double>::max(), std::numeric_limits<double>::max());
        editor->setDecimals(6);
        editor->selectAll();
        return editor;
    }

    // is never called
    QByteArray valuePropertyName() const {
        return QByteArray();
    }
};

RobotSpecsDialog::RobotSpecsDialog(const robot::Specs &specs, const robot::Specs &def, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::RobotSpecsDialog),
    m_specs(specs),
    m_robot(true),
    m_blockItemChanged(false)
{
    init(&def);
}

RobotSpecsDialog::RobotSpecsDialog(const robot::Specs &specs, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::RobotSpecsDialog),
    m_specs(specs),
    m_robot(false),
    m_blockItemChanged(false)
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

void RobotSpecsDialog::init(const robot::Specs *def)
{
    ui->setupUi(this);

    m_model = new QStandardItemModel(this);
    m_model->setHorizontalHeaderLabels(QStringList() << "Name" << "Value");
    ui->tree->setModel(m_model);
    QStyledItemDelegate* delegate;
    if (m_robot) {
        // reset is only available for robots
        delegate = new ResettableItemDelegate(this);
    } else {
        delegate = new QStyledItemDelegate(this);
    }

    QItemEditorFactory *factory = new QItemEditorFactory();
    factory->registerEditor(QVariant::Double, new DoubleEditorCreator());
    delegate->setItemEditorFactory(factory);

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
            value_item->setData(QVariant::fromValue(field), DATA_FIELD);
            value_item->setData(QVariant::fromValue(specs), DATA_MESSAGE);

            QVariant data;
            bool has_default = def;
            if (def && !refl->HasField(*specs, field)) {
                data = getData(*def, field);
                value_item->setData(data, Qt::EditRole);
            } else {
                data = getData(*specs, field);
                value_item->setData(data, Qt::EditRole);
                if (def) {
                    data = getData(*def, field);
                    QFont font;
                    font.setBold(true);
                    value_item->setFont(font);
                }
            }
            value_item->setData(data, DATA_DEFAULT);
            value_item->setData(QVariant::fromValue(has_default), DATA_HAS_DEFAULT);

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

void RobotSpecsDialog::itemChanged(QStandardItem *item)
{
    if (m_blockItemChanged) {
        return;
    }
    const QVariant value = item->data(Qt::EditRole);
    Q_ASSERT_X(value.isValid() || m_robot, "itemChanged", "Reset is only possible for robots");

    // for sub-tables, no data is present
    if (!item->data(DATA_FIELD).isValid()) {
        return;
    }
    const google::protobuf::FieldDescriptor *field = item->data(DATA_FIELD).value<const google::protobuf::FieldDescriptor*>();
    google::protobuf::Message *message = item->data(DATA_MESSAGE).value<google::protobuf::Message*>();
    const google::protobuf::Reflection *refl = message->GetReflection();
    if (value.isValid()) {
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
    } else {
        // calls this function again
        QVariant data = item->data(DATA_DEFAULT);
        item->setData(data, Qt::EditRole);
        if (item->data(DATA_HAS_DEFAULT).toBool()) {
            if (field->cpp_type() == google::protobuf::FieldDescriptor::CPPTYPE_BOOL
                    || field->cpp_type() == google::protobuf::FieldDescriptor::CPPTYPE_FLOAT) {
                refl->ClearField(message, field);
            }
        }
    }

    if (m_robot) {
        m_blockItemChanged = true;
        QFont font;
        font.setBold(value.isValid());
        item->setFont(font);
        m_blockItemChanged = false;
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
