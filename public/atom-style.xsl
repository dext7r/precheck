<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh">
      <head>
        <title><xsl:value-of select="/atom:feed/atom:title"/> - Atom Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
            background: #f3e8ff;
            color: #7c3aed;
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
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
            color: #8b5cf6;
          }
          .item-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            font-size: 0.8rem;
            color: #9ca3af;
            margin-bottom: 0.75rem;
          }
          .item-summary {
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
            <span class="badge">⚛️ Atom Feed</span>
            <h1><xsl:value-of select="/atom:feed/atom:title"/></h1>
            <p class="description"><xsl:value-of select="/atom:feed/atom:subtitle"/></p>
            <a class="subscribe">
              <xsl:attribute name="href">
                <xsl:value-of select="/atom:feed/atom:link[@rel='alternate' and @type='text/html']/@href"/>
              </xsl:attribute>
              <span>🌐</span> 访问网站
            </a>
          </header>
          <div class="items">
            <xsl:for-each select="/atom:feed/atom:entry">
              <article class="item">
                <h2 class="item-title">
                  <a href="{atom:link[@rel='alternate']/@href}">
                    <xsl:value-of select="atom:title"/>
                  </a>
                </h2>
                <div class="item-meta">
                  <span>📅 <xsl:value-of select="substring(atom:published, 1, 10)"/></span>
                  <xsl:if test="atom:author/atom:name">
                    <span>👤 <xsl:value-of select="atom:author/atom:name"/></span>
                  </xsl:if>
                </div>
                <xsl:if test="atom:category">
                  <div style="margin-bottom: 0.5rem;">
                    <xsl:for-each select="atom:category">
                      <span class="category"><xsl:value-of select="@label"/></span>
                    </xsl:for-each>
                  </div>
                </xsl:if>
                <p class="item-summary"><xsl:value-of select="atom:summary"/></p>
              </article>
            </xsl:for-each>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
