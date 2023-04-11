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
#ifndef ENTRYPOINTSELECTIONTOOLBUTTON_H
#define ENTRYPOINTSELECTIONTOOLBUTTON_H

#include <QObject>
#include <QToolButton>

#include "protobuf/status.h"

class QMenu;
class QString;
template<typename T>
class QVector;

class EntrypointSelectionToolButton : public QToolButton
{
    Q_OBJECT
public:
    EntrypointSelectionToolButton(amun::StatusStrategyWrapper::StrategyType type, QWidget *parent = nullptr);

public slots:
    void setEntrypointList(const QVector<QString>&);
    void setCurrentEntrypoint(const QString&);

signals:
    void entrypointSelected(const QString&);

private:
    void addEntryPoint(QMenu *menu, const QString &name, const QString &entryPoint);
    QString shortenEntrypointName(const QMenu *menu, const QString &name, int targetLength);

private:
    amun::StatusStrategyWrapper::StrategyType m_type;
    QMenu *m_entryPoints;
};

#endif // ENTRYPOINTSELECTIONTOOLBUTTON_H
