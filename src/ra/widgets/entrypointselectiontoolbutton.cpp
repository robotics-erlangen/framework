/***************************************************************************
 *   Copyright 2023 Philipp Nordhus, Michael Eischer, Andreas Wendler,     *
 *                  Paul Bergmann                                          *
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
#include "entrypointselectiontoolbutton.h"

#include "protobuf/status.h"

#include <QMenu>
#include <QString>
#include <QVector>

EntrypointSelectionToolButton::EntrypointSelectionToolButton(amun::StatusStrategyWrapper::StrategyType type, QWidget *parent) :
    QToolButton(parent),
    m_type(type),
    m_entryPoints(new QMenu { this })

{
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    setText("<n/a>");
    setVisible(false);
    setPopupMode(QToolButton::InstantPopup);
    setMenu(m_entryPoints);

    connect(this, &EntrypointSelectionToolButton::triggered, this, [this](QAction *action) {
        emit entrypointSelected(action->data().toString());
    });
}

void EntrypointSelectionToolButton::setEntrypointList(const QVector<QString> &entrypoints)
{
    setVisible(entrypoints.size() > 0);

    // Rebuild entrypoint menu
    m_entryPoints->clear();
    for (const QString& name : entrypoints) {
        addEntryPoint(m_entryPoints, name, name);
    }
}

void EntrypointSelectionToolButton::setCurrentEntrypoint(const QString &entrypoint)
{
    if (entrypoint.isNull()) {
        setText("<n/a>");
    } else {
        const QString shortEntryPoint = shortenEntrypointName(m_entryPoints, entrypoint, 20);
        setText(shortEntryPoint);
    }
}

void EntrypointSelectionToolButton::addEntryPoint(QMenu *menu, const QString &name, const QString &entryPoint)
{
    int idx = name.indexOf("/");
    if (idx == -1) {
        QAction *action = menu->addAction(name);
        action->setData(entryPoint);
    } else {
        const QString nameLeft = name.left(idx);
        const QString nameRight = name.right(name.length() - idx - 1);
        QAction *action = NULL;
        const QList<QAction*> actions = menu->actions();
        if (!actions.isEmpty()) {
            action = actions.last();
        }

        QMenu *subMenu;
        if (action && action->text() == nameLeft) {
            subMenu = action->menu();
        } else {
            subMenu = menu->addMenu(nameLeft);
        }
        addEntryPoint(subMenu, nameRight, entryPoint);
    }
}

QString EntrypointSelectionToolButton::shortenEntrypointName(const QMenu *menu, const QString &name, int targetLength)
{
    // shorten entry point name
    QString left = "";
    QString right = name;
    while (left.length() + 1 + right.length() > targetLength) {
        int idx = right.indexOf("/");
        if (idx == -1) {
            break;
        } else {
            const QString nameLeft = right.left(idx);
            const QString nameRight = right.right(right.length() - idx - 1);

            // strip as many characters as possible while staying nonambiguous
            int maxCommon = 0;
            const QMenu *nextMenu = nullptr;
            foreach(QAction *action, menu->actions()) {
                QString name = action->text();
                if (name == nameLeft) {
                    // must always be present once
                    nextMenu = action->menu();
                    continue;
                }
                for (int i = 0; i < name.length(); ++i) {
                    if (i >= nameLeft.length() || name.at(i) != nameLeft.at(i)) {
                        maxCommon = std::max(maxCommon, i);
                        break;
                    }
                }
            }
            Q_ASSERT(nextMenu != nullptr);
            // add one distinguishing characters
            left += ((left.isEmpty())?"" : "/") + nameLeft.left(maxCommon+1);
            right = nameRight;
            menu = nextMenu;
        }
    }
    return left + ((left.isEmpty())?"" : "/") + right;
}
