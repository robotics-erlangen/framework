#include "texturecache.h"
#include "core/timer.h"

TextureCache::TextureCache(QGLContext *context) :
    m_context(context),
    m_cacheSize(0),
    m_sizeLimit(10*1000*100)
{ }

TextureCache::~TextureCache()
{
    for (TextureEntry *entry: m_entries) {
        m_context->deleteTexture(entry->textureId);
    }
    qDeleteAll(m_entries);
}

bool TextureCache::find(const QString &key, GLuint *textureId, QPixmap *pixmap)
{
    if (m_entries.contains(key)) {
        TextureEntry *entry = m_entries[key];
        *textureId = entry->textureId;
        *pixmap = entry->pixmap;
        // update last used
        m_lastUsed.remove(entry->lastUsed, key);
        entry->lastUsed = Timer::systemTime();
        m_lastUsed.insertMulti(entry->lastUsed, key);
        return true;
    }
    return false;
}

GLuint TextureCache::insert(const QString &key, const QPixmap &pixmap)
{
    remove(key);

    m_cacheSize += calcSize(pixmap);
    while (m_cacheSize > m_sizeLimit && m_lastUsed.size() > 0) {
        // warning: delKey musn't get passed to remove as reference as it will be deleted!!!
        QString delKey = m_lastUsed.first();
        remove(delKey);
    }

    TextureEntry *entry = new TextureEntry;
    entry->pixmap = pixmap;
    entry->textureId = m_context->bindTexture(entry->pixmap);
    entry->lastUsed = Timer::systemTime();
    m_entries[key] = entry;
    m_lastUsed.insertMulti(entry->lastUsed, key);

    return entry->textureId;
}

int TextureCache::calcSize(const QPixmap &pixmap)
{
    return pixmap.width() * pixmap.height() * (pixmap.depth() / 8);
}

void TextureCache::remove(const QString &key)
{
    if (!m_entries.contains(key)) {
        return;
    }

    TextureEntry *entry = m_entries[key];
    m_context->deleteTexture(entry->textureId);
    m_cacheSize -= calcSize(entry->pixmap);
    m_lastUsed.remove(entry->lastUsed, key);
    m_entries.remove(key);

    delete entry;
}
