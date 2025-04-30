/***************************************************************************
 *   Copyright 2025 Andreas Wendler                                        *
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

#include "gameeventswidget.h"
#include "ui_gameeventswidget.h"

#include <QPainter>
#include <QProgressBar>

GameEventsWidget::GameEventsWidget(QWidget *parent)
    : QWidget(parent)
    , ui(new Ui::GameEventsWidget)
{
    ui->setupUi(this);

    m_progress = new QProgressBar(ui->scanLog);
    m_progress->setRange(0, 100);
    m_progress->setValue(0);
    m_progress->setTextVisible(false);
    m_progress->setStyleSheet(
        "QProgressBar {"
        " background-color: transparent;"
        " border: none;"
        " }"
        "QProgressBar::chunk {"
        " background-color: palette(highlight);"
        " border-radius: 4px;"
        "}"
    );
    m_progress->setGeometry(ui->scanLog->rect());
    m_progress->setAttribute(Qt::WA_TransparentForMouseEvents);
    m_progress->show();

    connect(ui->scanLog, &QPushButton::clicked, this, &GameEventsWidget::scanLogClicked);
    connect(ui->eventTable, &QTableWidget::cellDoubleClicked, this, &GameEventsWidget::cellDoubleClicked);
}

GameEventsWidget::~GameEventsWidget()
{
    delete ui;
}

void GameEventsWidget::handleStatus(const Status &status)
{
    if (!status->has_pure_ui_response()) {
        return;
    }
    const auto& response = status->pure_ui_response();
    if (!response.has_game_events_progress()) {
        return;
    }
    const auto& gameEventsProgress = response.game_events_progress();
    const auto progress = 100 * gameEventsProgress.current_packet() / gameEventsProgress.total_packets();
    m_progress->setValue(progress);

    for (const auto& event : gameEventsProgress.game_events()) {
        addEntry(event.packet(), event.game_event());
    }

    if (gameEventsProgress.current_packet() == gameEventsProgress.total_packets()) {
        ui->scanLog->setEnabled(true);
        m_progress->setValue(0);
    }
}

gameController::Team GameEventsWidget::teamForEvent(const gameController::GameEvent& event)
{
    const google::protobuf::Reflection *refl = event.GetReflection();
    const google::protobuf::Descriptor *desc = gameController::GameEvent::descriptor();
    // extract fields using reflection
    for (int i = 0; i < desc->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = desc->field(i);

        // This must be updated whenever a new field is added to the game event
        if (field->name() == "type"
                || field->name() == "origin"
                || field->name() == "id"
                || field->name() == "created_timestamp") {
            // ignore them as they are not events
            continue;
        }
        if (refl->HasField(event, field)) {
            const google::protobuf::Message &eventMessage = refl->GetMessage(event, field);
            const google::protobuf::Reflection *messageRefl = eventMessage.GetReflection();
            const google::protobuf::Descriptor *messageDesc = eventMessage.GetDescriptor();

            for (int b = 0;b < messageDesc->field_count(); b++) {
                const google::protobuf::FieldDescriptor *field = messageDesc->field(b);
                std::string fieldName = field->name();
                if (fieldName == "by_team") {
                    const auto enumValue = messageRefl->GetEnumValue(eventMessage, field);
                    return static_cast<gameController::Team>(enumValue);
                }
            }
        }
    }
    return gameController::Team::UNKNOWN;
}


void GameEventsWidget::addEntry(uint64_t frame, const gameController::GameEvent& event)
{
    const auto row = ui->eventTable->rowCount();
    ui->eventTable->insertRow(row);
    ui->eventTable->setItem(row, 0, new QTableWidgetItem(QString("%1").arg(frame)));
    
    const auto byTeam = teamForEvent(event);
    auto* teamItem = new QTableWidgetItem();
    QPixmap pixmap(10, 10);
    pixmap.fill(Qt::transparent);
    QPainter painter(&pixmap);
    painter.setRenderHint(QPainter::Antialiasing);
    if (byTeam == gameController::Team::YELLOW) {
        painter.setBrush(Qt::yellow);
    } else if (byTeam == gameController::Team::BLUE) {
        painter.setBrush(Qt::blue);
    } else {
        painter.setBrush(Qt::gray); // Default color for unknown team
    }
    painter.setPen(Qt::NoPen);
    painter.drawEllipse(0, 0, 10, 10);
    painter.end();
    teamItem->setData(Qt::DecorationRole, pixmap);
    teamItem->setTextAlignment(Qt::AlignCenter);
    ui->eventTable->setItem(row, 1, teamItem);

    const auto enumName = gameController::GameEvent_Type_descriptor()->FindValueByNumber(event.type())->name();
    const auto nameAsQStr = QString::fromStdString(enumName);
    ui->eventTable->setItem(row, 2, new QTableWidgetItem(nameAsQStr));
}

void GameEventsWidget::scanLogClicked()
{
    ui->scanLog->setEnabled(false);
    ui->eventTable->clearContents();

    Command command{new amun::Command};
    command->mutable_playback()->mutable_collect_game_events();
    emit sendCommand(command);
}

void GameEventsWidget::resizeEvent(QResizeEvent* /*event*/)
{
    m_progress->setGeometry(ui->scanLog->rect());
}

void GameEventsWidget::cellDoubleClicked(int row, int /*column*/)
{
    auto* packetItem = ui->eventTable->item(row, 0);
    bool ok = false;
    const auto packetNum = packetItem->text().toULongLong(&ok);

    if (ok) {
        Command command{new amun::Command};
        command->mutable_playback()->set_seek_packet(packetNum);
        emit sendCommand(command);
    }
}