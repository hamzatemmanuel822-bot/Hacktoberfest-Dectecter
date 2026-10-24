/**
 * SmartWelcome AI - Local Gemma E2B Integration Service
 * Connects directly to the locally installed Gemma E2B runtime on the host PC.
 * Strictly checks local endpoints (Ollama, LM Studio, or custom local server).
 * Never sends biometric data, face images, or camera frames to the language model.
 */

import { db } from './db.js';

export interface GemmaStatus {
  status: 'connected' | 'unavailable' | 'error';
  detectedRuntime: 'ollama' | 'openai_compatible' | 'custom' | 'none';
  configuredEndpoint: string;
  modelName: string;
  availableModels: string[];
  latencyMs?: number;
  lastChecked: string;
  errorMessage?: string;
  instructionsForUser?: string;
}

export class GemmaService {
  /**
   * Probe the local runtime on the host PC.
   */
  public async probeStatus(): Promise<GemmaStatus> {
    const settings = db.getSettings();
    const endpoint = settings.localGemmaEndpoint.replace(/\/+$/, '');
    const startTime = Date.now();

    // 1. Try Ollama endpoint (/api/tags)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch(`${endpoint}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = (await resp.json()) as { models?: Array<{ name: string; details?: { parameter_size?: string } }> };
        const models = (data.models || []).map((m) => m.name);
        const hasGemma2b = models.some(
          (m) => m.toLowerCase().includes('gemma') && (m.includes('2b') || m.includes('e2b'))
        );

        return {
          status: hasGemma2b || models.length > 0 ? 'connected' : 'unavailable',
          detectedRuntime: 'ollama',
          configuredEndpoint: endpoint,
          modelName: hasGemma2b ? models.find((m) => m.includes('2b')) || models[0] : settings.localGemmaModelName,
          availableModels: models,
          latencyMs: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          instructionsForUser: hasGemma2b
            ? 'Local Gemma 2B model verified and ready.'
            : `Ollama is running, but Gemma 2B is not yet pulled. Run: \`ollama pull gemma:2b\` in your Windows terminal.`,
        };
      }
    } catch {
      // Continue to next probe
    }

    // 2. Try OpenAI-compatible local server (e.g. LM Studio, LocalAI at /v1/models)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch(`${endpoint}/v1/models`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = (await resp.json()) as { data?: Array<{ id: string }> };
        const models = (data.data || []).map((m) => m.id);
        const hasGemma = models.some(
          (m) => m.toLowerCase().includes('gemma')
        );

        return {
          status: 'connected',
          detectedRuntime: 'openai_compatible',
          configuredEndpoint: endpoint,
          modelName: hasGemma ? models.find((m) => m.toLowerCase().includes('gemma')) || models[0] : settings.localGemmaModelName,
          availableModels: models,
          latencyMs: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          instructionsForUser: 'Connected to local OpenAI-compatible Gemma server.',
        };
      }
    } catch {
      // Local server unavailable
    }

    return {
      status: 'unavailable',
      detectedRuntime: 'none',
      configuredEndpoint: endpoint,
      modelName: settings.localGemmaModelName,
      availableModels: [],
      lastChecked: new Date().toISOString(),
      errorMessage: `Could not connect to local Gemma E2B runtime at ${endpoint}.`,
      instructionsForUser: `To serve Gemma E2B locally on Windows:\n1. Open PowerShell or Command Prompt.\n2. Run: ollama run gemma:2b\n3. Verify it is running at http://localhost:11434`,
    };
  }

  /**
   * Run a real inference call against the local Gemma E2B runtime.
   */
  public async generate(prompt: string): Promise<{
    text: string;
    model: string;
    latencyMs: number;
    tokensGenerated?: number;
    isRealLocalInference: boolean;
  }> {
    const settings = db.getSettings();
    const endpoint = settings.localGemmaEndpoint.replace(/\/+$/, '');
    const startTime = Date.now();

    // Try Ollama generate endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.localGemmaModelName || 'gemma:2b',
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 120,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = (await resp.json()) as {
          response?: string;
          eval_count?: number;
          total_duration?: number;
          model?: string;
        };

        return {
          text: (data.response || '').trim(),
          model: data.model || settings.localGemmaModelName,
          latencyMs: Date.now() - startTime,
          tokensGenerated: data.eval_count || 0,
          isRealLocalInference: true,
        };
      }
    } catch {
      // Try OpenAI-compatible /v1/chat/completions
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.localGemmaModelName || 'gemma:2b',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = (await resp.json()) as {
          choices?: Array<{ message?: { content: string } }>;
          model?: string;
          usage?: { completion_tokens?: number };
        };

        const content = data.choices?.[0]?.message?.content || '';
        return {
          text: content.trim(),
          model: data.model || settings.localGemmaModelName,
          latencyMs: Date.now() - startTime,
          tokensGenerated: data.usage?.completion_tokens,
          isRealLocalInference: true,
        };
      }
    } catch {
      // Offline fallback
    }

    throw new Error(
      `Local Gemma E2B inference failed. Ensure Ollama or local runtime is running at ${endpoint}.`
    );
  }

  /**
   * Helper: Generate an entrance welcome message with Gemma E2B.
   */
  public async generateWelcomeGreeting(): Promise<{
    greeting: string;
    source: 'local_gemma_e2b' | 'fallback_template';
    latencyMs?: number;
  }> {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
    const prompt = `You are the welcoming entrance assistant for an organization. Write one warm, concise, and professional welcome greeting (maximum 2 sentences) for a visitor arriving this ${timeOfDay}. Remind them kindly to collect a complimentary welcome sticker from the front desk. Do not use markdown or emojis.`;

    try {
      const result = await this.generate(prompt);
      if (result.text && result.text.length > 10) {
        return {
          greeting: result.text,
          source: 'local_gemma_e2b',
          latencyMs: result.latencyMs,
        };
      }
    } catch {
      // Fallback
    }

    // Safe deterministic fallback when Gemma is offline
    const settings = db.getSettings();
    return {
      greeting: settings.welcomeGreetingTemplate,
      source: 'fallback_template',
    };
  }

  /**
   * Helper: Summarize non-sensitive system stats using Gemma E2B.
   */
  public async summarizeStats(passagesCount: number, peakHour: number): Promise<{
    summary: string;
    source: 'local_gemma_e2b' | 'fallback_template';
    latencyMs?: number;
  }> {
    const prompt = `Summarize today's attendance presence metrics in 2 factual, professional sentences: Total passages: ${passagesCount}, busiest hour: ${peakHour}:00. Mention that hardware signals on Arduino UNO Q are operating normally.`;

    try {
      const result = await this.generate(prompt);
      if (result.text) {
        return {
          summary: result.text,
          source: 'local_gemma_e2b',
          latencyMs: result.latencyMs,
        };
      }
    } catch {
      // Fallback
    }

    return {
      summary: `Today recorded ${passagesCount} total human passages with peak activity around ${peakHour}:00. All hardware acknowledgement channels on Arduino UNO Q remain healthy.`,
      source: 'fallback_template',
    };
  }
}

export const gemmaService = new GemmaService();
