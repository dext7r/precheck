<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh">
      <head>
        <title>Sitemap - 站点地图</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          header {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          h1 {
            font-size: 1.75rem;
            color: #1f2937;
            margin-bottom: 0.5rem;
          }
          .subtitle {
            color: #6b7280;
            font-size: 0.95rem;
          }
          .stats {
            display: flex;
            gap: 2rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
          }
          .stat {
            text-align: center;
          }
          .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
          }
          .stat-label {
            font-size: 0.75rem;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .content {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: #f9fafb;
            padding: 1rem;
            text-align: left;
            font-size: 0.75rem;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e5e7eb;
          }
          td {
            padding: 1rem;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.875rem;
            color: #374151;
          }
          tr:hover {
            background: #f9fafb;
          }
          tr:last-child td {
            border-bottom: none;
          }
          a {
            color: #667eea;
            text-decoration: none;
            word-break: break-all;
          }
          a:hover {
            text-decoration: underline;
          }
          .priority {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
          }
          .priority-high { background: #dcfce7; color: #166534; }
          .priority-medium { background: #fef9c3; color: #854d0e; }
          .priority-low { background: #f3f4f6; color: #6b7280; }
          .freq {
            color: #9ca3af;
            font-size: 0.8rem;
          }
          @media (max-width: 768px) {
            body { padding: 1rem; }
            .stats { flex-wrap: wrap; gap: 1rem; }
            th, td { padding: 0.75rem 0.5rem; font-size: 0.8rem; }
            .hide-mobile { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🗺️ Sitemap</h1>
            <p class="subtitle">此 XML Sitemap 文件包含站点的所有页面链接，供搜索引擎索引。</p>
            <div class="stats">
              <div class="stat">
                <div class="stat-value"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
                <div class="stat-label">页面数量</div>
              </div>
            </div>
          </header>
          <div class="content">
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th class="hide-mobile">最后更新</th>
                  <th class="hide-mobile">更新频率</th>
                  <th>优先级</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <xsl:sort select="sitemap:priority" order="descending"/>
                  <tr>
                    <td>
                      <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                    </td>
                    <td class="hide-mobile">
                      <xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/>
                    </td>
                    <td class="hide-mobile freq">
                      <xsl:value-of select="sitemap:changefreq"/>
                    </td>
                    <td>
                      <xsl:variable name="priority" select="sitemap:priority"/>
                      <span>
                        <xsl:attribute name="class">
                          <xsl:text>priority </xsl:text>
                          <xsl:choose>
                            <xsl:when test="$priority &gt;= 0.8">priority-high</xsl:when>
                            <xsl:when test="$priority &gt;= 0.5">priority-medium</xsl:when>
                            <xsl:otherwise>priority-low</xsl:otherwise>
                          </xsl:choose>
                        </xsl:attribute>
                        <xsl:value-of select="sitemap:priority"/>
                      </span>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
