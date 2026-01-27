<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            min-height: 100vh;
            padding: 2rem;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          header {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          .badge {
            display: inline-block;
            background: #fff7ed;
            color: #c2410c;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }
          h1 {
            font-size: 1.75rem;
            color: #1f2937;
            margin-bottom: 0.5rem;
          }
          .description {
            color: #6b7280;
            font-size: 0.95rem;
            margin-bottom: 1rem;
          }
          .subscribe {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
          }
          .subscribe:hover {
            opacity: 0.9;
          }
          .items {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .item {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .item-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 0.5rem;
          }
          .item-title a {
            color: inherit;
            text-decoration: none;
          }
          .item-title a:hover {
            color: #f97316;
          }
          .item-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.8rem;
            color: #9ca3af;
            margin-bottom: 0.75rem;
          }
          .item-description {
            color: #4b5563;
            font-size: 0.9rem;
            line-height: 1.6;
          }
          .category {
            display: inline-block;
            background: #f3f4f6;
            color: #6b7280;
            padding: 0.125rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            margin-right: 0.25rem;
          }
          @media (max-width: 768px) {
            body { padding: 1rem; }
            header, .item { padding: 1.25rem; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <span class="badge">📡 RSS Feed</span>
            <h1><xsl:value-of select="/rss/channel/title"/></h1>
            <p class="description"><xsl:value-of select="/rss/channel/description"/></p>
            <a class="subscribe" href="{/rss/channel/link}">
              <span>🌐</span> 访问网站
            </a>
          </header>
          <div class="items">
            <xsl:for-each select="/rss/channel/item">
              <article class="item">
                <h2 class="item-title">
                  <a href="{link}"><xsl:value-of select="title"/></a>
                </h2>
                <div class="item-meta">
                  <span>📅 <xsl:value-of select="substring(pubDate, 1, 16)"/></span>
                  <xsl:if test="dc:creator">
                    <span>👤 <xsl:value-of select="dc:creator"/></span>
                  </xsl:if>
                </div>
                <xsl:if test="category">
                  <div style="margin-bottom: 0.5rem;">
                    <xsl:for-each select="category">
                      <span class="category"><xsl:value-of select="."/></span>
                    </xsl:for-each>
                  </div>
                </xsl:if>
                <p class="item-description"><xsl:value-of select="description"/></p>
              </article>
            </xsl:for-each>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
