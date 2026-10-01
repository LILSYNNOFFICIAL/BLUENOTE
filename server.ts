import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

let envGeminiKeyDenied = false;

function getGeminiClient(overrideKey?: string): GoogleGenAI | null {
  const trimmedOverride = overrideKey ? String(overrideKey).trim() : '';
  if (trimmedOverride && trimmedOverride.startsWith('AIza')) {
    return new GoogleGenAI({
      apiKey: trimmedOverride,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  if (envGeminiKeyDenied) {
    return null;
  }

  const envKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();

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
    const imgResp = await fetch(imgUrl, {
      signal: imgController.signal,
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    const envKey = (
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();
    const hasKey = Boolean(envKey && envKey.startsWith('AIza') && !envGeminiKeyDenied);
    res.json({
      status: 'ok',
      geminiConfigured: hasKey,
      mode: hasKey ? 'hybrid-server-gemini-and-free-cloud-ai' : 'free-cloud-and-local-ai',
    });
  });

  // 1. Server-Side AI Chat / Grounding / Brain Dump Endpoint
  app.post('/api/ai/chat', async (req, res) => {
    const {
      prompt,
      systemInstruction,
      useSearchGrounding,
      useMapsGrounding,
      latLng,
      userGeminiKey,
      geminiApiKey,
      userGroqKey,
      groqApiKey,
      userOpenRouterKey,
      openRouterApiKey,
    } = req.body || {};

    const effectiveGeminiKey = userGeminiKey || geminiApiKey;
    const effectiveGroqKey = userGroqKey || groqApiKey;
    const effectiveOpenRouterKey = userOpenRouterKey || openRouterApiKey;

    const ai = getGeminiClient(effectiveGeminiKey);
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

        const modelName = useMapsGrounding ? 'gemini-2.5-flash' : 'gemini-3-flash-preview';
        const response = await ai.models.generateContent({
          model: modelName,
          contents: String(prompt || ''),
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
        if (!effectiveGeminiKey && String(err?.message || '').includes('403')) {
          envGeminiKeyDenied = true;
        }
      }
    }

    // Try Groq if key provided
    if (effectiveGroqKey && String(effectiveGroqKey).trim()) {
      try {
        const gResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${String(effectiveGroqKey).trim()}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
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
        if (gResp.ok) {
          const gData: any = await gResp.json();
          const text = gData?.choices?.[0]?.message?.content?.trim();
          if (text) {
            res.json({
              text,
              links: [],
              model: 'Groq • llama-3.3-70b-versatile',
              modelUsed: 'Groq • llama-3.3-70b-versatile',
            });
            return;
          }
        }
      } catch {}
    }

    // Try OpenRouter if key provided
    if (effectiveOpenRouterKey && String(effectiveOpenRouterKey).trim()) {
      try {
        const orResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${String(effectiveOpenRouterKey).trim()}`,
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct:free',
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
        if (orResp.ok) {
          const orData: any = await orResp.json();
          const text = orData?.choices?.[0]?.message?.content?.trim();
          if (text) {
            res.json({
              text,
              links: [],
              model: 'OpenRouter • llama-3.3-70b-instruct:free',
              modelUsed: 'OpenRouter • llama-3.3-70b-instruct:free',
            });
            return;
          }
        }
      } catch {}
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

  // 2. Server-Side Gemini Music Composition & Lyrics Endpoint
  app.post('/api/ai/music', async (req, res) => {
    const ai = getGeminiClient(req.body?.userGeminiKey);
    if (!ai) {
      res.status(503).json({ error: 'Using on-device stereo song studio' });
      return;
    }

    try {
      const { prompt, durationSec } = req.body || {};
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Compose a complete musical arrangement and structured song lyrics (Verse 1, Chorus, Verse 2, Bridge) for: "${prompt}" (Duration: ${durationSec || 24}s). Include a realistic BPM (72-136) and 16 melody note frequencies in Hz.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              genre: { type: Type.STRING },
              bpm: { type: Type.NUMBER },
              keySignature: { type: Type.STRING },
              chordNames: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              melodyFrequenciesHz: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
              },
              lyricsAndNotes: { type: Type.STRING },
            },
            required: ['title', 'genre', 'bpm', 'keySignature', 'lyricsAndNotes'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      if (!req.body?.userGeminiKey && String(err?.message || '').includes('403')) {
        envGeminiKeyDenied = true;
      }
      res.status(503).json({ error: 'Using on-device stereo song studio' });
    }
  });

  // 3. Server-Side Multi-Engine Image Generation Endpoint
  // Supports: Hugging Face FLUX.1-schnell -> Google Gemini Image -> Pollinations Flux -> Wikimedia HD Subject Search -> Client Subject Studio
  app.post('/api/ai/image', async (req, res) => {
    const {
      prompt,
      aspectRatio,
      base64Image,
      mimeType,
      userGeminiKey,
      userHfToken,
    } = req.body || {};

    const rawPrompt = String(prompt || 'Vibrant bluebird perched on a blossoming branch').trim();
    const visualPrompt = cleanImagePromptServer(rawPrompt);
    const { width, height } = getAspectDimensionsServer(aspectRatio || '16:9');

    // Tier A: Hugging Face Free Inference API (FLUX.1-schnell) if user provided token
    if (!base64Image && userHfToken && String(userHfToken).trim()) {
      try {
        const hfResp = await fetch(
          'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${String(userHfToken).trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: `${visualPrompt}, centered subject in clear focus, high detail, masterpiece`,
            }),
          }
        );
        if (hfResp.ok) {
          const arrayBuf = await hfResp.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.length > 2048) {
            const contentType = hfResp.headers.get('content-type') || 'image/jpeg';
            res.json({
              imageUrl: `data:${contentType};base64,${buf.toString('base64')}`,
              caption: `Generated with FLUX.1-schnell (${width}×${height}) — Subject: "${visualPrompt}"`,
              model: 'FLUX.1-schnell (Hugging Face Free API)',
            });
            return;
          }
        }
      } catch {}
    }

    // Tier B: Google Gemini Image (when a valid AIza* Gemini API key is configured)
    const ai = getGeminiClient(userGeminiKey);
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
          model: 'gemini-2.5-flash-image',
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
              model: 'gemini-2.5-flash-image',
            });
            return;
          }
        }
      } catch (e: any) {
        if (!userGeminiKey && String(e?.message || '').includes('403')) {
          envGeminiKeyDenied = true;
        }
      }
    }

    // Tier C: Server-Side Proxy to Pollinations Image Model (if not rate-limited)
    if (!base64Image) {
      try {
        const seed = Math.floor(Math.random() * 1000000);
        const enhancedPrompt = `${visualPrompt}, centered subject in clear focus, ultra detailed, vibrant lighting`;
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          enhancedPrompt
        )}?width=${width}&height=${height}&seed=${seed}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6500);
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

    // Tier D: Wikimedia Commons High-Resolution Subject Photography & Artwork Search
    if (!base64Image) {
      const wikiImg = await fetchWikimediaSubjectImage(visualPrompt);
      if (wikiImg) {
        res.json({
          imageUrl: wikiImg.dataUrl,
          caption: `HD Subject Visual (${width}×${height}) — "${wikiImg.title}" (Matched for "${visualPrompt}")`,
          model: 'Free Cloud Visual Engine (HD Subject Match)',
        });
        return;
      }
    }

    res.status(503).json({ error: 'Fallback to client subject studio engine' });
  });

  // 4. Server-Side Audio Transcription Endpoint
  app.post('/api/ai/transcribe', async (req, res) => {
    const { base64Audio, mimeType, userGeminiKey } = req.body || {};
    const ai = getGeminiClient(userGeminiKey);
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
      if (!userGeminiKey && String(err?.message || '').includes('403')) {
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
