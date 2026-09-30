import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient(overrideKey?: string): GoogleGenAI | null {
  const apiKey =
    (overrideKey && overrideKey.trim()) ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;
    const hasKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    res.json({
      status: 'ok',
      geminiConfigured: hasKey,
      mode: hasKey ? 'hybrid-server-gemini-and-local-engine' : 'local-self-contained-ai',
    });
  });

  // 1. Server-Side Gemini Text / Chat / Grounding / Brain Dump Endpoint (gemini-3-flash-preview)
  app.post('/api/ai/chat', async (req, res) => {
    const ai = getGeminiClient(req.body?.userGeminiKey);
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured in environment' });
      return;
    }

    try {
      const { prompt, systemInstruction, useSearchGrounding, useMapsGrounding, latLng } =
        req.body || {};

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
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gemini chat error' });
    }
  });

  // 2. Server-Side Gemini Music Composition & Lyrics Endpoint (gemini-3-flash-preview)
  app.post('/api/ai/music', async (req, res) => {
    const ai = getGeminiClient(req.body?.userGeminiKey);
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured in environment' });
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
      res.status(500).json({ error: err?.message || 'Gemini music composition error' });
    }
  });

  // 3. Server-Side Gemini Image Generation & SVG Vector Art Endpoint
  app.post('/api/ai/image', async (req, res) => {
    const ai = getGeminiClient(req.body?.userGeminiKey);
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured in environment' });
      return;
    }

    try {
      const { prompt, aspectRatio, base64Image, mimeType } = req.body || {};

      // Try native gemini-2.5-flash-image first
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
        parts.push({ text: String(prompt || 'Architectural minimalist illustration') });

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
              caption: `Generated with gemini-2.5-flash-image (${aspectRatio || '16:9'}) — "${prompt}"`,
              model: 'gemini-2.5-flash-image',
            });
            return;
          }
        }
      } catch {
        // Fall through to Gemini 3 Flash SVG artwork synthesis
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a rich, gallery-grade SVG artwork (viewBox="0 0 1280 720" or matching ${aspectRatio || '16:9'}) with multi-stop gradients, atmospheric lighting, geometric or organic forms, and zero text watermarks for: "${prompt}". Also provide a short 1-sentence artistic caption.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              svgMarkup: { type: Type.STRING },
              caption: { type: Type.STRING },
            },
            required: ['svgMarkup', 'caption'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gemini image synthesis error' });
    }
  });

  // 4. Server-Side Audio Transcription Endpoint (gemini-3-flash-preview)
  app.post('/api/ai/transcribe', async (req, res) => {
    const ai = getGeminiClient(req.body?.userGeminiKey);
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured in environment' });
      return;
    }

    try {
      const { base64Audio, mimeType } = req.body || {};
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
      res.status(500).json({ error: err?.message || 'Audio transcription failed' });
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
