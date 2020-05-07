/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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
#include <QEvent>
#include <QHBoxLayout>
#include <QToolButton>

WidgetResetWrapper::WidgetResetWrapper(QWidget *child, QWidget* parent):
    QWidget(parent),
    m_child(child),
    m_isReset(false)
{
    QHBoxLayout *layout = new QHBoxLayout(this);
    layout->setMargin(0); // no margin to have widgets use the complete editor space
    layout->setSpacing(0);

    child->setParent(this);
    child->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    layout->addWidget(child);

    QToolButton *resetBtn = new QToolButton(this);
    resetBtn->setFocusPolicy(Qt::StrongFocus); // ensure the tool button gets the focus when clicked
    resetBtn->setArrowType(Qt::LeftArrow);
    connect(resetBtn, SIGNAL(clicked()), this, SLOT(handleReset()));
    layout->addWidget(resetBtn);

    setLayout(layout);
    setAutoFillBackground(true);
}

void WidgetResetWrapper::handleReset() {
    m_isReset = true;
    emit resetValue();
}

ResettableItemDelegate::ResettableItemDelegate(QObject *parent) :
    QStyledItemDelegate(parent) { }

QWidget *ResettableItemDelegate::createEditor(QWidget *parent, const QStyleOptionViewItem &option, const QModelIndex &index ) const
{
    // create default editor and wrap it
    QWidget *editor = QStyledItemDelegate::createEditor(parent, option, index);
    WidgetResetWrapper *wrapper = new WidgetResetWrapper(editor, parent);
    // connect reset signal
    connect(wrapper, SIGNAL(resetValue()), this, SLOT(resetValue()));
    return wrapper;
}

bool ResettableItemDelegate::eventFilter(QObject *object, QEvent *event)
{
    // cast and check taken from QAbstractItemDelegatePrivate::editorEventFilter
    QWidget *editor = qobject_cast<QWidget*>(object);
    if (!editor)
        return false;

    if (event->type() == QEvent::Hide) {
        // properly close the editor if the dialog gets hidden
        emit commitData(editor);
        emit closeEditor(editor);
        // don't swallow the hide event
        return false;
    }
    return QStyledItemDelegate::eventFilter(object, event);
}

void ResettableItemDelegate::setEditorData(QWidget *editor, const QModelIndex &index) const
{
    WidgetResetWrapper* wrapper = qobject_cast<WidgetResetWrapper*>(editor);
    if (wrapper == NULL) {
        return;
    }
    // set the wrapped editor to it's model value
    QStyledItemDelegate::setEditorData(wrapper->child(), index);
}

void ResettableItemDelegate::setModelData(QWidget *editor, QAbstractItemModel *model, const QModelIndex &index) const
{
    WidgetResetWrapper* wrapper = qobject_cast<WidgetResetWrapper*>(editor);
    if (wrapper == NULL) {
        return;
    }
    if (wrapper->isReset()) {
        // invalid QVariant indicates reset
        model->setData(index, QVariant(), Qt::EditRole);
    } else {
        // default way to store result
        QStyledItemDelegate::setModelData(wrapper->child(), model, index);
    }
}

void ResettableItemDelegate::resetValue() {
    WidgetResetWrapper *wrapper = qobject_cast<WidgetResetWrapper*>(sender());
    if (wrapper != NULL) {
        emit commitData(wrapper); // trigger setModelData
        emit closeEditor(wrapper, NoHint);
    }
}
