#ifndef TEXTURECACHE_H
#define TEXTURECACHE_H

#include <QGLContext>
#include <QHash>
#include <QMultiMap>

class TextureCache
{
public:
    explicit TextureCache(QGLContext *context);
    ~TextureCache();

    bool find(const QString &key, GLuint *textureId, QPixmap *pixmap);
    GLuint insert(const QString &key, const QPixmap &pixmap);
    void remove(const QString &key);
private:
    int calcSize(const QPixmap &pixmap);

    struct TextureEntry {
        GLuint textureId;
        qint64 lastUsed;
        QPixmap pixmap;
    };

    QGLContext *m_context;
    QHash<QString, TextureEntry*> m_entries;
    QMultiMap<qint64, QString> m_lastUsed;
    int m_cacheSize;
    const int m_sizeLimit;
};

#endif // TEXTURECACHE_H
