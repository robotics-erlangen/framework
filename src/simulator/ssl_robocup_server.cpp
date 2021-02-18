//========================================================================
//  This software is free: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License Version 3,
//  as published by the Free Software Foundation.
//
//  This software is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  Version 3 in the file COPYING that came with this distribution.
//  If not, see <http://www.gnu.org/licenses/>.
//========================================================================
/*!
  \file    robocup_ssl_server.cpp
  \brief   C++ Implementation: robocup_ssl_server
  \author  Stefan Zickler, 2009
  \author  Jan Segre, 2012
*/
//========================================================================
#include "ssl_robocup_server.h"
#include <QtNetwork>
#include <QColor>
#include <iostream>

using namespace std;

RoboCupSSLServer::RoboCupSSLServer(QObject *parent, const quint16 &port, const string &net_address) :
    _socket(new QUdpSocket(parent)),
    _port(port),
    _net_address(new QHostAddress(QString(net_address.c_str())))
{
    _socket->setSocketOption(QAbstractSocket::MulticastTtlOption, 1);
}

RoboCupSSLServer::~RoboCupSSLServer()
{
    mutex.lock();
    mutex.unlock();
    delete _socket;
    delete _net_address;
}

void RoboCupSSLServer::change_port(const quint16 & port)
{
    _port = port;
}

void RoboCupSSLServer::change_address(const string & net_address)
{
    delete _net_address;
    _net_address = new QHostAddress(QString(net_address.c_str()));
}

static void logStatus(QString string, QColor) {
    std::cout << string.toStdString() << std::endl;
}

bool RoboCupSSLServer::send(const QByteArray& datagram) {
    mutex.lock();
    quint64 bytes_sent = _socket->writeDatagram(datagram, *_net_address, _port);
    mutex.unlock();
    if (bytes_sent != datagram.size()) {
        logStatus(QString("Sending UDP datagram failed (maybe too large?). Size was: %1 byte(s).").arg(datagram.size()), QColor("red"));
        return false;
    }

    return true;
}

