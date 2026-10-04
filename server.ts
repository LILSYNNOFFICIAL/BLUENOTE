import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import firebaseConfig from './firebase-applet-config.json';

let envGeminiKeyDenied = false;

function getGeminiClient(): GoogleGenAI | null {
  if (envGeminiKeyDenied) {
    return null;
  }

  const envKey = (process.env.GEMINI_API_KEY || '').trim();

  // Only use the environment key if it is a valid AIza* Gemini API key
  if (!envKey || envKey === 'MY_GEMINI_API_KEY' || !envKey.startsWith('AIza')) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: envKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function cleanImagePromptServer(rawPrompt: string): string {
  let s = String(rawPrompt || '').trim();
  const prefixPatterns = [
    /^(please\s+)?(can\s+you\s+|could\s+you\s+|would\s+you\s+|i\s+want\s+you\s+to\s+|i\s+want\s+|i'd\s+like\s+to\s+|i'd\s+like\s+|i\s+need\s+|let's\s+)?(make|create|generate|draw|render|paint|show|give|design|produce|sketch|illustrate|take)(\s+me)?\s+/i,
    /^(a\s+|an\s+|the\s+|some\s+)?(nice\s+|good\s+|cool\s+|beautiful\s+|cute\s+|hd\s+|high\s+res\s+|detailed\s+|realistic\s+)?(picture|pic|pictures|image|images|img|photo|photograph|photos|illustration|drawing|painting|artwork|art|sketch|graphic|render|rendering|portrait|shot|view)\s+(of\s+|showing\s+|with\s+|featuring\s+|about\s+)/i,
    /^(a\s+|an\s+|the\s+)?(picture|pic|image|img|photo|photograph|illustration|drawing|painting|sketch)\s+(of\s+|showing\s+|with\s+|featuring\s+)/i,
    /^(of\s+|showing\s+|featuring\s+)/i,
  ];
  for (const pat of prefixPatterns) {
    s = s.replace(pat, '').trim();
  }
  return s || String(rawPrompt || '').trim();
}

function getAspectDimensionsServer(aspectRatio = '16:9'): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 };
    case '9:16':
      return { width: 720, height: 1280 };
    case '4:3':
      return { width: 1024, height: 768 };
    case '3:4':
      return { width: 768, height: 1024 };
    case '16:9':
    default:
      return { width: 1280, height: 720 };
  }
}

async function fetchWikimediaSubjectImage(
  visualPrompt: string
): Promise<{ dataUrl: string; title: string } | null> {
  try {
    const coreNoun = visualPrompt
      .replace(/^(a|an|the)\s+/i, '')
      .replace(/[^\w\s-]/g, ' ')
      .trim();
    if (!coreNoun) return null;

    // Disambiguate common single-word animal/subject prompts so Wikimedia returns wildlife/subject photography
    let searchTerm = coreNoun;
    if (/^bird$/i.test(coreNoun)) {
      searchTerm = 'bluebird perched branch';
    } else if (/^cat$/i.test(coreNoun)) {
      searchTerm = 'tabby cat portrait';
    } else if (/^dog$/i.test(coreNoun)) {
      searchTerm = 'golden retriever dog';
    } else if (/^car$/i.test(coreNoun)) {
      searchTerm = 'red sports car';
    } else if (/^flower$/i.test(coreNoun)) {
      searchTerm = 'blooming rose flower macro';
    }

    const searchQ = `${searchTerm} filetype:bitmap -map -diagram -stamp -book -coat -flag -gottlieb`;
    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      searchQ
    )}&gsrlimit=10&prop=imageinfo&iiprop=url|dimensions|mime&iiurlwidth=1280&format=json&origin=*`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const r = await fetch(wikiUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BlueNoteStudio/1.0' },
    });
    clearTimeout(timer);

    if (!r.ok) return null;
    const d: any = await r.json();
    const pages = Object.values(d?.query?.pages || {}).filter((p: any) => {
      const ii = p?.imageinfo?.[0];
      const t = String(p?.title || '').toLowerCase();
      return (
        ii &&
        (ii.mime === 'image/jpeg' || ii.mime === 'image/png') &&
        Number(ii.width || 0) >= 500 &&
        !/map|diagram|chart|icon|logo|stamp|book|page|placa|sign|text|coat_of_arms|flag|graph|table|scan|signature/i.test(
          t
        )
      );
    }) as any[];

    if (pages.length === 0) return null;
    const chosen = pages[0];
    const imgUrl = chosen?.imageinfo?.[0]?.thumburl || chosen?.imageinfo?.[0]?.url;
    if (!imgUrl) return null;

    const imgController = new AbortController();
    const imgTimer = setTimeout(() => imgController.abort(), 8000);
    if (!isSafeOutboundImageUrl(imgUrl)) return null;
    const imgResp = await fetch(imgUrl, {
      signal: imgController.signal,
      redirect: 'error',
      headers: { 'User-Agent': 'BlueNoteStudio/1.0' },
    });
    clearTimeout(imgTimer);

    if (!imgResp.ok) return null;
    const arrayBuf = await imgResp.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.length < 4096) return null;

    const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
    const cleanTitle = String(chosen.title || coreNoun)
      .replace(/^File:/i, '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/_/g, ' ');

    return {
      dataUrl: `data:${contentType};base64,${buf.toString('base64')}`,
      title: cleanTitle,
    };
  } catch {
    return null;
  }
}

function isSafeOutboundImageUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      host === 'localhost' ||
      host === 'metadata.google.internal' ||
      host === 'metadata.amazonaws.com' ||
      host.endsWith('.local') ||
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80:')
    ) return false;
    const octets = host.split('.').map(Number);
    if (
      octets.length === 4 &&
      octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (octets[0] === 10 ||
        octets[0] === 127 ||
        octets[0] === 0 ||
        (octets[0] === 169 && octets[1] === 254) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168))
    ) return false;
    return true;
  } catch {
    return false;
  }
}

const apiRateBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_RATE_LIMIT_KEYS = 10_000;

function rateLimitApi(maxRequests: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    const now = Date.now();
    const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const existing = apiRateBuckets.get(key);

    // Bound attacker-controlled cardinality. Without a cap, a botnet or spoofed
    // proxy address set could grow this in-memory map until the Node process runs OOM.
    if (apiRateBuckets.size >= MAX_RATE_LIMIT_KEYS && !existing) {
      for (const [oldKey, bucket] of apiRateBuckets) {
        if (now >= bucket.resetAt) apiRateBuckets.delete(oldKey);
        if (apiRateBuckets.size < MAX_RATE_LIMIT_KEYS) break;
      }
      if (apiRateBuckets.size >= MAX_RATE_LIMIT_KEYS) {
        const oldestKey = apiRateBuckets.keys().next().value;
        if (typeof oldestKey === 'string') apiRateBuckets.delete(oldestKey);
      }
    }

    if (!existing || now >= existing.resetAt) {
      apiRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((existing.resetAt - now) / 1000));
      res.status(429).json({ error: 'Too many AI requests. Please try again later.' });
      return;
    }

    existing.count += 1;
    next();
  };
}


async function requireFirebaseAuth(req: any, res: any, next: any) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  const idToken = match?.[1]?.trim();
  const apiKey = String(process.env.FIREBASE_WEB_API_KEY || firebaseConfig.apiKey || '').trim();

  if (!idToken || !apiKey || idToken.length > 2000) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ idToken }),
      }
    );
    clearTimeout(timer);

    if (!response.ok) {
      res.status(401).json({ error: 'Invalid or expired authentication token.' });
      return;
    }

    const data: any = await response.json();
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (!user?.localId || user.disabled === true) {
      res.status(401).json({ error: 'Invalid or disabled account.' });
      return;
    }

    req.firebaseUser = {
      uid: String(user.localId),
      email: typeof user.email === 'string' ? user.email : null,
    };
    next();
  } catch {
    res.status(503).json({ error: 'Authentication service unavailable.' });
  }
}

function validateAiPayload(req: any, res: any, next: any) {
  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const systemInstruction =
    typeof body.systemInstruction === 'string' ? body.systemInstruction : '';

  if (prompt.length > 20000 || systemInstruction.length > 12000) {
    res.status(413).json({ error: 'AI prompt is too large.' });
    return;
  }

  const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
  const base64Image = typeof body.base64Image === 'string' ? body.base64Image : '';
  const base64Audio = typeof body.base64Audio === 'string' ? body.base64Audio : '';

  if (imageDataUrl.length > 12 * 1024 * 1024
      || base64Image.length > 12 * 1024 * 1024
      || base64Audio.length > 16 * 1024 * 1024) {
    res.status(413).json({ error: 'Uploaded AI media is too large.' });
    return;
  }

  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '20mb' }));

  // The server-side AI routes can spend provider quota, so keep abuse bounded even
  // when this server is exposed directly to the public internet.
  app.use('/api/ai', requireFirebaseAuth, (req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  }, rateLimitApi(30, 60_000), validateAiPayload);

  app.get('/api/health', (_req, res) => {
    const envKey = (process.env.GEMINI_API_KEY || '').trim();
    const hasKey = Boolean(envKey && envKey.startsWith('AIza') && !envGeminiKeyDenied);
    res.json({
      status: 'ok',
      geminiConfigured: hasKey,
      authProvider: 'firebase-auth',
      mode: hasKey ? 'hybrid-server-gemini-and-free-cloud-ai' : 'free-cloud-and-local-ai',
    });
  });

  // 1. Server-Side AI Chat / Grounding / Brain Dump / Vision OCR Endpoint
  app.post('/api/ai/chat', async (req, res) => {
    const {
      prompt,
      systemInstruction,
      useSearchGrounding,
      useMapsGrounding,
      latLng,
      imageDataUrl,
    } = req.body || {};

    const ai = getGeminiClient();
    if (ai) {
      try {
        const tools: any[] = [];
        if (useSearchGrounding) {
          tools.push({ googleSearch: {} });
        }
        if (useMapsGrounding) {
          tools.push({ googleMaps: {} });
        }

        const config: any = {};
        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }
        if (tools.length > 0) {
          config.tools = tools;
        }
        if (useMapsGrounding && latLng?.latitude !== undefined && latLng?.longitude !== undefined) {
          config.toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: Number(latLng.latitude),
                longitude: Number(latLng.longitude),
              },
            },
          };
        }

        let contentsPayload: any = String(prompt || '');
        if (imageDataUrl && String(imageDataUrl).includes('base64,')) {
          const [header, base64Data] = String(imageDataUrl).split('base64,');
          const mimeMatch = header.match(/data:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          contentsPayload = [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            String(prompt || 'Extract all visible text from this image.'),
          ];
        }

        const modelName = useMapsGrounding ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config,
        });

        const groundingChunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const links: { title: string; uri: string; sourceType: 'web' | 'maps' }[] = [];

        for (const chunk of groundingChunks as any[]) {
          if (chunk.web?.uri) {
            links.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri,
              sourceType: 'web',
            });
          } else if (chunk.maps?.uri) {
            links.push({
              title: chunk.maps.title || 'Google Maps Place',
              uri: chunk.maps.uri,
              sourceType: 'maps',
            });
          }
        }

        res.json({
          text: response.text || '',
          links,
          model: modelName,
          modelUsed: modelName,
        });
        return;
      } catch (err: any) {
        if (String(err?.message || '').includes('403')) {
          envGeminiKeyDenied = true;
        }
      }
    }

    // Try 100% Free Cloud AI (Pollinations OpenAI-compatible endpoint with 5s timeout)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const fResp = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'openai',
          messages: [
            {
              role: 'system',
              content:
                systemInstruction ||
                'You are BlueNote AI, a concise executive productivity assistant.',
            },
            { role: 'user', content: String(prompt || '') },
          ],
        }),
      });
      clearTimeout(timer);
      if (fResp.ok) {
        const fData: any = await fResp.json();
        const text = fData?.choices?.[0]?.message?.content?.trim();
        if (text) {
          res.json({
            text,
            links: [],
            model: 'Free Cloud AI (No Key Needed)',
            modelUsed: 'Free Cloud AI (No Key Needed)',
          });
          return;
        }
      }
    } catch {}

    res.status(503).json({ error: 'Using on-device neural engine' });
  });

    // Helper: Call Zero-Key Public Hugging Face Gradio 5 FLUX.1 Spaces (FLUX.1-schnell & FLUX.1-merged)
  async function generateGradioFluxImage(
    visualPrompt: string,
    width: number,
    height: number
  ): Promise<{ dataUrl: string; modelName: string } | null> {
    const crispPrompt = `${visualPrompt}, ultra-crisp 8k UHD resolution, razor-sharp focus, intricate micro-details, professional studio lighting, DSLR masterpiece`;
    const clampedW = Math.min(1280, Math.max(512, Math.round(width / 32) * 32));
    const clampedH = Math.min(1280, Math.max(512, Math.round(height / 32) * 32));

    const gradioSpaces = [
      {
        name: 'FLUX.1-schnell (Black Forest Labs HD)',
        baseUrl: 'https://black-forest-labs-flux-1-schnell.hf.space',
        endpoint: '/infer',
        data: [crispPrompt, 0, true, clampedW, clampedH, 4],
      },
      {
        name: 'FLUX.1-Merged (8-Step Crisp HD)',
        baseUrl: 'https://multimodalart-flux-1-merged.hf.space',
        endpoint: '/infer',
        data: [crispPrompt, 0, true, clampedW, clampedH, 3.5, 8],
      },
      {
        name: 'Stable Diffusion 3 Medium (28-Step HD)',
        baseUrl: 'https://stabilityai-stable-diffusion-3-medium.hf.space',
        endpoint: '/infer',
        data: [
          crispPrompt,
          'blurry, low quality, pixelated, watermark, ugly, deformed',
          0,
          true,
          clampedW,
          clampedH,
          5,
          28,
        ],
      },
    ];

    for (const space of gradioSpaces) {
      try {
        const postController = new AbortController();
        const postTimer = setTimeout(() => postController.abort(), 6000);
        const postResp = await fetch(
          `${space.baseUrl}/gradio_api/call${space.endpoint}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: postController.signal,
            body: JSON.stringify({ data: space.data }),
          }
        );
        clearTimeout(postTimer);
        if (!postResp.ok) continue;

        const postJson: any = await postResp.json();
        const eventId = postJson?.event_id;
        if (!eventId) continue;

        const sseController = new AbortController();
        const sseTimer = setTimeout(() => sseController.abort(), 14000);
        const sseResp = await fetch(
          `${space.baseUrl}/gradio_api/call${space.endpoint}/${eventId}`,
          { signal: sseController.signal }
        );
        const sseText = await sseResp.text();
        clearTimeout(sseTimer);

        const dataLine = sseText
          .split('\n')
          .find((line) => line.startsWith('data: ') && line.includes('"url"'));
        if (!dataLine) continue;

        const parsedArr = JSON.parse(dataLine.slice(6));
        const fileObj = Array.isArray(parsedArr) ? parsedArr[0] : parsedArr;
        const fileUrl =
          fileObj?.url ||
          (fileObj?.path
            ? `${space.baseUrl}/gradio_api/file=${fileObj.path}`
            : null);
        if (!fileUrl) continue;
        const parsedFileUrl = new URL(String(fileUrl));
        if (parsedFileUrl.protocol !== 'https:' || parsedFileUrl.hostname !== new URL(space.baseUrl).hostname || parsedFileUrl.username || parsedFileUrl.password || parsedFileUrl.port) continue;

        const imgController = new AbortController();
        const imgTimer = setTimeout(() => imgController.abort(), 9000);
        const imgResp = await fetch(parsedFileUrl, { signal: imgController.signal, redirect: 'error' });
        clearTimeout(imgTimer);
        if (!imgResp.ok) continue;

        const arrayBuf = await imgResp.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length < 4096) continue;

        const contentType = imgResp.headers.get('content-type') || 'image/webp';
        return {
          dataUrl: `data:${contentType};base64,${buf.toString('base64')}`,
          modelName: space.name,
        };
      } catch {
        // Try next Gradio 5 space
      }
    }
    return null;
  }

  // Helper: Openverse High-Resolution Photography Search
  async function fetchOpenverseSubjectImage(
    visualPrompt: string
  ): Promise<{ dataUrl: string; title: string } | null> {
    try {
      const keywords = visualPrompt
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !/^(with|from|that|this|into|over|under|very|ultra|high|res)$/i.test(w))
        .slice(0, 4)
        .join(' ');
      if (!keywords) return null;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5500);
      const r = await fetch(
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(keywords)}&page_size=8`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'BlueNoteStudio/2.0' },
        }
      );
      clearTimeout(timer);
      if (!r.ok) return null;
      const d: any = await r.json();
      const results = (d?.results || []).filter(
        (item: any) =>
          item?.url &&
          Number(item?.width || 1000) >= 600 &&
          /\.(jpg|jpeg|png|webp)$/i.test(String(item.url).split('?')[0])
      );
      for (const chosen of results.slice(0, 3)) {
        try {
          const imgCtrl = new AbortController();
          const imgTimer = setTimeout(() => imgCtrl.abort(), 5500);
          if (!isSafeOutboundImageUrl(String(chosen.url))) continue;
          const imgResp = await fetch(String(chosen.url), {
            signal: imgCtrl.signal,
            redirect: 'error',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BlueNoteStudio/2.0)' },
          });
          clearTimeout(imgTimer);
          if (!imgResp.ok) continue;
          const ct = imgResp.headers.get('content-type') || '';
          if (!ct.startsWith('image/')) continue;
          const buf = Buffer.from(await imgResp.arrayBuffer());
          if (buf.length > 8192) {
            return {
              dataUrl: `data:${ct};base64,${buf.toString('base64')}`,
              title: String(chosen.title || keywords),
            };
          }
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  }

// 3. Server-Side Multi-Engine Image Generation Endpoint
  // Supports: Google Gemini Image -> Zero-Key Gradio 5 FLUX.1-schnell & FLUX.1-Merged -> Pollinations -> Openverse & Wikimedia HD
  app.post('/api/ai/image', async (req, res) => {
    const {
      prompt,
      aspectRatio,
      base64Image,
      mimeType,
    } = req.body || {};

    const rawPrompt = String(prompt || 'Vibrant bluebird perched on a blossoming branch').trim();
    const visualPrompt = cleanImagePromptServer(rawPrompt);
    const { width, height } = getAspectDimensionsServer(aspectRatio || '16:9');

    // Tier A: Google Gemini Image (when a valid AIza* Gemini API key is configured on server)
    const ai = getGeminiClient();
    if (ai) {
      try {
        const parts: any[] = [];
        if (base64Image) {
          const cleanB64 = String(base64Image).includes(',')
            ? String(base64Image).split(',')[1]
            : String(base64Image);
          parts.push({
            inlineData: {
              data: cleanB64,
              mimeType: mimeType || 'image/png',
            },
          });
        }
        parts.push({ text: visualPrompt });

        const imgResp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio || '16:9',
            },
          },
        });

        for (const part of imgResp.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType || 'image/png';
            res.json({
              imageUrl: `data:${outMime};base64,${part.inlineData.data}`,
              caption: `Generated with Gemini Image (${aspectRatio || '16:9'}) — Subject: "${visualPrompt}"`,
              model: 'gemini-3.1-flash-image',
            });
            return;
          }
        }
      } catch (e: any) {
        if (String(e?.message || '').includes('403')) {
          envGeminiKeyDenied = true;
        }
      }
    }

    // Tier C: Zero-Key Public FLUX.1-schnell & FLUX.1-Merged Gradio 5 Cluster (Ultra-Crisp 2.3s Generation!)
    if (!base64Image) {
      const gradioFlux = await generateGradioFluxImage(visualPrompt, width, height);
      if (gradioFlux) {
        res.json({
          imageUrl: gradioFlux.dataUrl,
          caption: `Generated Ultra-Crisp HD Artwork (${width}×${height}, ${aspectRatio || '16:9'}) — "${visualPrompt}"`,
          model: gradioFlux.modelName,
        });
        return;
      }
    }

    // Tier D: Server-Side Proxy to Pollinations Image Model (if not rate-limited)
    if (!base64Image) {
      try {
        const seed = Math.floor(Math.random() * 1000000);
        const enhancedPrompt = `${visualPrompt}, centered subject in clear focus, ultra detailed, vibrant lighting`;
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          enhancedPrompt
        )}?width=${width}&height=${height}&seed=${seed}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5500);
        const pollResp = await fetch(pollUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BlueNoteStudio/1.0)',
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          },
        });
        clearTimeout(timer);

        const contentType = pollResp.headers.get('content-type') || '';
        if (pollResp.ok && contentType.startsWith('image/')) {
          const arrayBuf = await pollResp.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.length > 4096) {
            res.json({
              imageUrl: `data:${contentType};base64,${buf.toString('base64')}`,
              caption: `Generated HD AI Artwork (${width}×${height}, ${aspectRatio || '16:9'}) — Subject: "${visualPrompt}"`,
              model: 'Free Cloud AI (FLUX Diffusion)',
            });
            return;
          }
        }
      } catch {}
    }

    // Tier E: Openverse & Wikimedia Commons High-Resolution Subject Photography
    if (!base64Image) {
      const ovImg = await fetchOpenverseSubjectImage(visualPrompt);
      if (ovImg) {
        res.json({
          imageUrl: ovImg.dataUrl,
          caption: `HD Photography Match (${width}×${height}) — "${ovImg.title}"`,
          model: 'Openverse HD Visual Engine',
        });
        return;
      }

      const wikiImg = await fetchWikimediaSubjectImage(visualPrompt);
      if (wikiImg) {
        res.json({
          imageUrl: wikiImg.dataUrl,
          caption: `HD Subject Visual (${width}×${height}) — "${wikiImg.title}" (Matched for "${visualPrompt}")`,
          model: 'Wikimedia HD Photography Engine',
        });
        return;
      }
    }

    res.status(503).json({ error: 'Fallback to client subject studio engine' });
  });

  // 4. Server-Side Audio Transcription Endpoint
  app.post('/api/ai/transcribe', async (req, res) => {
    const { base64Audio, mimeType } = req.body || {};
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'Using browser speech engine' });
      return;
    }

    try {
      const cleanBase64 = String(base64Audio || '').includes(',')
        ? String(base64Audio).split(',')[1]
        : String(base64Audio || '');

      if (!cleanBase64) {
        res.status(400).json({ error: 'No audio payload provided' });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'audio/webm',
            },
          },
          'Transcribe this voice note accurately into clean text.',
        ],
      });

      res.json({
        transcript: response.text || '',
        model: 'gemini-3-flash-preview',
      });
    } catch (err: any) {
      if (String(err?.message || '').includes('403')) {
        envGeminiKeyDenied = true;
      }
      res.status(503).json({ error: 'Using browser speech engine' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BlueNote Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
