import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
app.use(express.json());

// 内存数据库：存储文章列表
let articles = [
  {
    id: '1',
    title: 'GEO 优化指南：如何让大模型偏好你的内容？',
    summary: '探讨生成式引擎优化（GEO）的核心策略，包括权威性建设、实体关系表达与结构化数据注入，帮助品牌在 AI 搜索时代抢占心智。',
    content: '# GEO 优化指南：让大模型偏好你的内容\n\n在生成式 AI 时代，传统的 SEO 正在失效。用户不再通过点击十个蓝色链接来寻找答案，而是直接向 ChatGPT、Perplexity 等大模型提问。这就是 **GEO (Generative Engine Optimization)** 诞生的背景。\n\n## 什么是 GEO？\n\nGEO 是一种全新的优化范式。它的核心目标不是“提高网页排名”，而是“让大模型在生成答案时，主动引用和推荐你的品牌信息”。\n\n## GEO 的三大核心策略\n\n### 1. 权威性建设 (Authoritative Construction)\n大模型在训练和推理时，会赋予高权威度的数据源更高的权重。你需要：\n- 引用行业权威报告和数据。\n- 建立清晰的作者背景和专家背书。\n- 使用专业的行业术语，避免口语化和模糊表达。\n\n### 2. 语义清晰度 (Semantic Clarity)\n大模型喜欢结构化的信息。为了降低 AI 的解析成本，你应该：\n- 大量使用**列表 (Lists)** 和 **表格 (Tables)**。\n- 采用清晰的实体关系（Entity-Relationship）表达。\n- 避免过度营销的修辞手法，直奔主题。\n\n### 3. 高引用价值 (High Citation Value)\n如果你的内容只是一般性常识，大模型不需要引用你。你必须提供：\n- 独家的数据洞察。\n- 具体的实战案例分析。\n- 原创的结构化解决方案（如“五步工作流”）。\n\n> **小马克劳洞察**：GEO 不是对 SEO 的修补，而是一次推倒重来。谁能最先掌握向大模型“喂料”的技巧，谁就能在下一个十年占据流量高地。',
    date: '2026-04-01',
    tags: ['GEO优化策略', '引用的事实依据来源：OpenClaw研究', '权威性建设']
  },
  {
    id: '2',
    title: '从 SEO 到 GEO：企业营销的范式转移',
    summary: '分析传统搜索引擎与 AI 搜索引擎的底层逻辑差异，揭示企业为何必须立即启动 GEO 战略。',
    content: '# 从 SEO 到 GEO：企业营销的范式转移\n\n随着 AI 搜索的普及，流量漏斗正在发生根本性改变。\n\n## 传统 SEO 的困境\n传统 SEO 依赖于关键词匹配和外链权重。用户需要：\n1. 搜索关键词\n2. 浏览搜索结果页 (SERP)\n3. 点击链接\n4. 在网页中寻找答案\n\n这个过程中，流量流失率极高。\n\n## GEO 的零点击截流\nGEO 实现了真正的**“零点击截流”**。大模型直接将你的品牌信息作为答案输出给用户。用户无需跳转，即可获得完整的信息和品牌认知。\n\n### 如何实现？\n通过**小马克劳 GEO 智能体**，我们可以自动化地完成舆情诊断、策略生成和智能写作，将符合 AI 偏好的语料精准分发。',
    date: '2026-03-28',
    tags: ['AI搜索引擎营销', '对比分析', '零点击截流']
  }
];

// --- API 路由 ---

// 获取文章列表
app.get('/api/articles', (req, res) => {
  // 返回列表时不包含完整 content，减小体积
  const list = articles.map(a => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    date: a.date,
    tags: a.tags
  }));
  res.json(list);
});

// 获取单篇文章详情
app.get('/api/articles/:id', (req, res) => {
  const article = articles.find(a => a.id === req.params.id);
  if (article) {
    res.json(article);
  } else {
    res.status(404).json({ error: 'Article not found' });
  }
});

// 新增文章 (供 OpenClaw 调用)
app.post('/api/articles', (req, res) => {
  const { title, summary, content, tags } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const newArticle = {
    id: Date.now().toString(),
    title,
    summary: summary || content.substring(0, 100) + '...',
    content,
    date: new Date().toISOString().split('T')[0],
    tags: tags || []
  };
  
  // 插入到最前面
  articles.unshift(newArticle);
  res.status(201).json(newArticle);
});

// 删除文章
app.delete('/api/articles/:id', (req, res) => {
  const initialLength = articles.length;
  articles = articles.filter(a => a.id !== req.params.id);
  
  if (articles.length < initialLength) {
    res.json({ success: true, message: 'Article deleted' });
  } else {
    res.status(404).json({ error: 'Article not found' });
  }
});

// --- Vite 中间件与静态文件服务 ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
