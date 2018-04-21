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

#ifndef RESETTABLEITEMDELEGATE_H
#define RESETTABLEITEMDELEGATE_H

#include <QObject>
#include <QWidget>
#include <QStyledItemDelegate>

// do not even think about using this class...
class WidgetResetWrapper : public QWidget
{
   Q_OBJECT
public:
    explicit WidgetResetWrapper(QWidget *child, QWidget* parent);

    QWidget *child() const { return m_child; }
    bool isReset() const { return m_isReset; }

private slots:
    void handleReset();

signals:
    void resetValue();

private:
    QWidget *m_child;
    bool m_isReset;
};

class ResettableItemDelegate : public QStyledItemDelegate
{
    Q_OBJECT
public:
    explicit ResettableItemDelegate(QObject *parent);

    QWidget *createEditor(QWidget *parent, const QStyleOptionViewItem &option, const QModelIndex &index ) const override;
    bool eventFilter(QObject *object, QEvent *event) override;
    void setEditorData(QWidget *editor, const QModelIndex &index) const override;
    void setModelData(QWidget *editor, QAbstractItemModel *model, const QModelIndex &index) const override;

private slots:
    void resetValue();
};

#endif // RESETTABLEITEMDELEGATE_H
