#ifndef EXTERNALGAMECONTROLLER_H
#define EXTERNALGAMECONTROLLER_H

#include <memory>
#include <QByteArray>
#include <QTcpSocket>
#include <QHostAddress>
#include <google/protobuf/message.h>

class QObject;

class ExternalGameController
{
public:
    ExternalGameController(bool isAutoref, QObject *parent = nullptr);
    bool connectGameController();
    void closeConnection();
    bool receiveGameControllerMessage(google::protobuf::Message *type);
    bool sendGameControllerMessage(const google::protobuf::Message *message);
    void setRefereeHost(QString host);

private:
    QTcpSocket m_gameControllerSocket;
    int m_nextPackageSize = -1; // negative if not known yet
    QByteArray m_partialPacket;
    unsigned int m_sizeBytesPosition = 0;
    QHostAddress m_gameControllerHost;

    bool m_isAutoref;
};

#endif // EXTERNALGAMECONTROLLER_H
