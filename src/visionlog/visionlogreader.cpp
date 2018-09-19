/***************************************************************************
 *   Copyright 2016 Alexander Danzer                                       *
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

#include "visionlogreader.h"
#include "visionlogheader.h"
#include <QCoreApplication>
#include <QtDebug>
#include <QtEndian>
#include <fstream>
#include "protobuf/ssl_wrapper.pb.h"
#include <iomanip>
#include <utility>

const char * VisionLog::DEFAULT_FILE_HEADER_NAME = "SSL_LOG_FILE";

VisionLogReader::VisionLogReader(const QString& filename):
    QObject()
{
    // keep reference to filename bytes alive
    QByteArray filenameBytes = filename.toUtf8();
    const char *fname = filenameBytes.data();
    in_stream = new std::ifstream(fname, std::ios_base::in | std::ios_base::binary);
    if (!in_stream->is_open()) {
        m_errorMessage =  "Error opening log file \"" + filename + "\"!";
        return;
    }

    VisionLog::FileHeader fileHeader;
    in_stream->read((char*) &fileHeader, sizeof(fileHeader));
    // Log data is stored big endian, convert to host byte order
    fileHeader.version = qFromBigEndian(fileHeader.version);

    if (strncmp(fileHeader.name, VisionLog::DEFAULT_FILE_HEADER_NAME, sizeof(fileHeader.name)) != 0) {
        m_errorMessage = "Unrecognized logfile header";
        return;
    }
}

QList<std::pair<qint64, VisionLog::MessageType>> VisionLogReader::indexFile()
{
    long startPosition = in_stream->tellg();
    VisionLog::DataHeader dataHeader;
    QList<std::pair<qint64, VisionLog::MessageType>> result;
    m_index.clear();
    while (!in_stream->eof()) {
        m_index[result.size()] = in_stream->tellg();
        in_stream->read((char*) &dataHeader, sizeof(dataHeader));
        if (in_stream->eof()) {
            // TODO: invalid file
            break;
        }

        // Log data is stored big endian, convert to host byte order
        dataHeader.timestamp = qFromBigEndian((qint64)dataHeader.timestamp);
        dataHeader.messageType = (VisionLog::MessageType) qFromBigEndian((int32_t) dataHeader.messageType);
        dataHeader.messageSize = qFromBigEndian(dataHeader.messageSize);

        result.append(std::make_pair(dataHeader.timestamp, dataHeader.messageType));

        in_stream->seekg(long(in_stream->tellg()) + dataHeader.messageSize);
    }
    in_stream->clear();
    in_stream->seekg(startPosition);

    return result;
}

std::pair<qint64, VisionLog::MessageType> VisionLogReader::readPacket(long fileOffset, QByteArray& data)
{
    VisionLog::DataHeader dataHeader;
    in_stream->seekg(fileOffset);
    if (!in_stream->eof()) {
        in_stream->read((char*) &dataHeader, sizeof(dataHeader));
        if (in_stream->eof()) {
            in_stream->clear();
            return std::make_pair(-1, VisionLog::MessageType::MESSAGE_INVALID);
        }

        // Log data is stored big endian, convert to host byte order
        dataHeader.timestamp = qFromBigEndian((qint64)dataHeader.timestamp);
        dataHeader.messageType = (VisionLog::MessageType) qFromBigEndian((int32_t) dataHeader.messageType);
        dataHeader.messageSize = qFromBigEndian(dataHeader.messageSize);

        char buffer[dataHeader.messageSize];
        in_stream->read(buffer, dataHeader.messageSize);
        data = QByteArray(buffer, dataHeader.messageSize);
        return std::make_pair(dataHeader.timestamp, dataHeader.messageType);
    }
    in_stream->clear();
    return std::make_pair(-1, VisionLog::MessageType::MESSAGE_INVALID);
}

std::pair<qint64, VisionLog::MessageType> VisionLogReader::visionPacketByIndex(int packet, QByteArray& data)
{
    return readPacket(m_index[packet], data);
}

std::pair<qint64, VisionLog::MessageType> VisionLogReader::nextVisionPacket(QByteArray& data)
{
    return readPacket(in_stream->tellg(), data);
}

VisionLogReader::~VisionLogReader()
{
    delete in_stream;
}
