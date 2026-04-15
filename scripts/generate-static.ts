/**
 * 静态站点生成脚本
 * 为大模型爬虫和搜索引擎预渲染完整 HTML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// 简单的 Markdown 转 HTML（处理基本语法）
function markdownToHtml(md: string): string {
  let html = md;

  // 先处理表格（需要整块处理）
  html = processTables(html);

  // 处理标题
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 处理加粗
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 处理链接
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // 处理列表
  html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');

  // 处理段落
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

// 处理表格块
function processTables(text: string): string {
  // 匹配整个表格块（多行），支持表格前有空行或普通段落
  const tableRegex = /\n\n(\|.+\|)\n(\|[-: |]+\|)\n((?:\|.+\|\n?)+)/g;

  return text.replace(tableRegex, (match, headerLine, separatorLine, bodyLines) => {
    // 解析表头
    const headers = headerLine.split('|').filter(c => c.trim()).map(c => c.trim());

    // 解析表体行
    const rows = bodyLines.trim().split('\n').filter(line => line.trim());

    // 构建表头 HTML
    let tableHtml = '<table><thead><tr>';
    headers.forEach(h => {
      tableHtml += `<th>${h}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    // 构建表体 HTML
    rows.forEach(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => c.trim());
      tableHtml += '<tr>';
      cells.forEach(c => {
        tableHtml += `<td>${c}</td>`;
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    return tableHtml;
  });
}

// 解析 Markdown frontmatter
function parseFrontmatter(content: string): { data: Record<string, any>; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content };
  }

  const frontmatterStr = match[1];
  const body = match[2];
  const data: Record<string, any> = {};

  // 简单解析 frontmatter
  frontmatterStr.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      // 去除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // 解析数组
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      }
      data[key] = value;
    }
  });

  return { data, content: body };
}

// 生成文章页面 HTML
function generateArticlePage(article: any, content: string): string {
  const { data, content: body } = parseFrontmatter(content);
  const title = data.title || article.title;
  const date = data.date || article.date;
  const tags = data.tags || article.tags || [];
  const summary = data.summary || article.summary;

  const articleHtml = markdownToHtml(body);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 小马克劳 GEO 智能体</title>
    <meta name="description" content="${summary}">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${summary}">
    <meta property="og:type" content="article">
    <meta property="article:published_time" content="${date}">
    ${tags.map(t => `<meta property="article:tag" content="${t}">`).join('\n    ')}

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${title}",
      "description": "${summary}",
      "datePublished": "${date}",
      "author": {
        "@type": "Organization",
        "name": "小马克劳团队"
      },
      "publisher": {
        "@type": "Organization",
        "name": "小马克劳",
        "url": "https://duyangc.github.io/Xiao-Ma-Claw"
      },
      "keywords": "${tags.join(', ')}"
    }
    </script>

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.8;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        article { background: white; padding: 60px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { font-size: 2.2em; margin-bottom: 20px; color: #1a1a2e; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 30px; }
        .tag { background: #e8f5e9; color: #16a34a; padding: 4px 12px; border-radius: 16px; font-size: 0.85em; }
        h2 { font-size: 1.5em; margin: 40px 0 20px; color: #1a1a2e; border-left: 4px solid #16a34a; padding-left: 16px; }
        h3 { font-size: 1.2em; margin: 30px 0 15px; color: #333; }
        p { margin-bottom: 20px; }
        ul, ol { margin: 20px 0; padding-left: 30px; }
        li { margin-bottom: 10px; }
        strong { color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        td, th { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f8f9fa; font-weight: 600; }
        a { color: #16a34a; }
        .back-link { display: inline-block; margin-bottom: 30px; color: #16a34a; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <article>
            <a href="/Xiao-Ma-Claw/#news" class="back-link">&larr; 返回资讯中心</a>
            <h1>${title}</h1>
            <div class="meta">
                <span>发布日期：${date}</span>
                <span style="margin-left: 20px;">作者：小马克劳 GEO 智能体</span>
            </div>
            <div class="content">
                ${articleHtml}
            </div>
            <div class="tags">
                ${tags.map((t: string) => `<span class="tag">${t}</span>`).join('')}
            </div>
        </article>
    </div>
</body>
</html>`;
}

// 生成资讯中心页面 HTML
function generateNewsPage(articles: any[]): string {
  const articlesHtml = articles.map(a => `
        <article class="article-card">
            <a href="/Xiao-Ma-Claw/article/${a.id}.html">
                <h2>${a.title}</h2>
            </a>
            <div class="meta">
                <span>${a.date}</span>
            </div>
            <p>${a.summary}</p>
            <div class="tags">
                ${a.tags.map((t: string) => `<span class="tag">${t}</span>`).join('')}
            </div>
        </article>
    `).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>资讯中心 - 小马克劳 GEO 智能体</title>
    <meta name="description" content="小马克劳 GEO 智能体最新资讯中心，提供 GEO 优化、AI 搜索、品牌曝光等领域的专业内容。">
    <meta name="robots" content="index, follow">

    <!-- JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "小马克劳 GEO 智能体资讯中心",
      "description": "GEO 优化、AI 搜索、品牌曝光专业内容",
      "url": "https://duyangc.github.io/Xiao-Ma-Claw/#news",
      "publisher": {
        "@type": "Organization",
        "name": "小马克劳"
      }
    }
    </script>

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.8;
            color: #333;
            background: #f5f5f5;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
        header { margin-bottom: 40px; }
        h1 { font-size: 2em; color: #1a1a2e; }
        .subtitle { color: #666; margin-top: 8px; }
        .articles { display: flex; flex-direction: column; gap: 24px; }
        .article-card {
            background: white;
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .article-card h2 {
            font-size: 1.4em;
            color: #1a1a2e;
            margin-bottom: 12px;
        }
        .article-card h2 a { color: inherit; text-decoration: none; }
        .article-card h2 a:hover { color: #16a34a; }
        .meta { color: #888; font-size: 0.85em; margin-bottom: 16px; }
        p { color: #555; margin-bottom: 16px; }
        .tags { display: flex; gap: 8px; flex-wrap: wrap; }
        .tag { background: #e8f5e9; color: #16a34a; padding: 4px 12px; border-radius: 16px; font-size: 0.8em; }
        footer {
            text-align: center;
            margin-top: 60px;
            padding: 30px;
            color: #888;
            font-size: 0.9em;
        }
        footer a { color: #16a34a; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>资讯中心</h1>
            <p class="subtitle">GEO 优化、AI 搜索、品牌曝光专业内容</p>
        </header>

        <main class="articles">
            ${articlesHtml}
        </main>

        <footer>
            <p>由 <a href="https://duyangc.github.io/Xiao-Ma-Claw">小马克劳 GEO 智能体</a> 提供</p>
        </footer>
    </div>
</body>
</html>`;
}

// 生成 sitemap.xml
function generateSitemap(articles: any[]): string {
  const baseUrl = 'https://duyangc.github.io/Xiao-Ma-Claw';

  const articlesUrls = articles.map(a => `
  <url>
    <loc>${baseUrl}/article/${a.id}.html</loc>
    <lastmod>${a.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/news.html</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>${articlesUrls}
</urlset>`;
}

// 主函数
async function main() {
  const distDir = path.join(ROOT, 'dist');
  const articleDir = path.join(distDir, 'article');

  // 确保目录存在
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(articleDir, { recursive: true });

  // 复制 SPA 入口文件（index.html）
  const indexPath = path.join(ROOT, 'index.html');
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, path.join(distDir, 'index.html'));
    console.log('✓ 复制 index.html');
  }

  // 复制 articles.json（供 SPA 使用）
  const articlesJsonPath = path.join(ROOT, 'articles.json');
  if (fs.existsSync(articlesJsonPath)) {
    fs.copyFileSync(articlesJsonPath, path.join(distDir, 'articles.json'));
    console.log('✓ 复制 articles.json');
  }

  // 读取 articles.json
  const articlesJson = fs.readFileSync(path.join(ROOT, 'articles.json'), 'utf-8');
  const articles = JSON.parse(articlesJson);

  console.log(`生成为 ${articles.length} 篇文章...`);

  // 生成资讯中心页面
  const newsHtml = generateNewsPage(articles);
  fs.writeFileSync(path.join(distDir, 'news.html'), newsHtml);
  console.log('✓ 生成 news.html');

  // 生成 sitemap.xml
  const sitemap = generateSitemap(articles);
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
  console.log('✓ 生成 sitemap.xml');

  // 生成每篇文章的静态 HTML
  for (const article of articles) {
    const mdPath = path.join(ROOT, 'articles', `${article.id}.md`);

    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf-8');
      const html = generateArticlePage(article, content);
      fs.writeFileSync(path.join(articleDir, `${article.id}.html`), html);
      console.log(`✓ 生成 article/${article.id}.html`);
    } else {
      console.warn(`⚠ 文章文件不存在: ${mdPath}`);
    }
  }

  console.log('\n静态站点生成完成！');
  console.log('生成的目录结构:');
  console.log('  dist/');
  console.log('    index.html (SPA 主入口)');
  console.log('    articles.json (文章列表)');
  console.log('    news.html (资讯中心 - 预渲染)');
  console.log('    sitemap.xml');
  console.log('    article/');
  articles.forEach(a => console.log(`      ${a.id}.html`));
}

main().catch(console.error);
