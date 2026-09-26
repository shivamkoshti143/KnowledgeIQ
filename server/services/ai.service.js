const https = require('https');

const OPENROUTER_API_KEY = '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';

function callOpenRouter({ messages, model = 'meta-llama/llama-4-maverick:free' } = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: messages.map(({ role, content }) => ({ role, content }))
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400 || parsed.error) {
            const msg = parsed.error?.message || parsed.error?.toString() || `OpenRouter error ${res.statusCode}`;
            return reject(new Error(msg));
          }
          const reply = parsed.choices?.[0]?.message?.content || '';
          resolve({ reply, raw: parsed });
        } catch (err) {
          reject(new Error('Invalid AI response'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are ABM TaskIQ Assistant. CRITICAL: Answer ONLY using the portal content provided below. Do NOT use outside knowledge. If the answer is not in the portal content, say "I couldn't find that in our portal." Keep answers concise. Reference items as [REF:id:TYPE:Title].`;

async function chat({ messages, context = [], model = 'meta-llama/llama-4-maverick:free' } = {}) {
  const allMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(({ role, content }) => ({ role, content }))
  ];
  return callOpenRouter({ messages: allMessages, model });
}

async function searchPortalContent(query, db) {
  const term = String(query || '').trim();
  if (!term) return [];
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const tasks = await db.getTasks();
  const knowledge = await db.getKnowledgePosts();
  const videos = await db.getVideos();

  const results = [
    ...tasks.map((item) => ({ id: item.id, type: 'task', title: item.title, description: item.description || '', tags: item.tags || [] })),
    ...(knowledge || []).map((item) => ({ id: item.id, type: 'knowledge', title: item.title, description: item.description || '', tags: item.tags || [] })),
    ...(videos || []).map((item) => ({ id: item.id, type: 'video', title: item.title, description: item.description || '', tags: item.tags || [] }))
  ];

  return results
    .map((item) => {
      const hay = `${item.title} ${item.description} ${(item.tags || []).join(' ')}`.toLowerCase();
      let score = 0;
      words.forEach((word) => {
        if (hay.includes(word)) score += 1;
      });
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

async function buildPortalAnswer(query, db) {
  const context = await searchPortalContent(query, db);
  if (!context.length) {
    return { reply: 'I couldn\'t find that in our portal.', references: [] };
  }

  const lines = context.map((item, idx) => {
    const title = item.title || 'Untitled';
    const desc = item.description ? ` - ${item.description.slice(0, 120)}` : '';
    return `${idx + 1}. [REF:${item.id}:${item.type}:${title}]${desc}`;
  });

  const reply = `I found these items in our portal:\n\n${lines.join('\n')}\n\nClick any item above to open its details.`;
  return { reply, references: context.map((item) => ({ id: item.id, type: item.type, title: item.title })) };
}

function parseReferences(text) {
  return (text || '').replace(/\[(\d+)\](task|knowledge|video)/g, (match, id, type) => match);
}

module.exports = { chat, callOpenRouter, searchPortalContent, buildPortalAnswer, parseReferences };
