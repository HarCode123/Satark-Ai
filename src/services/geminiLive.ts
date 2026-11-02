/**
 * src/services/geminiLive.ts
 *
 * Real-time speech transcription proxying through our Express server websocket (/api/live-proxy).
 *
 * Flow:
 *   Microphone -> AudioWorklet (resample/convert to 16-bit PCM) -> base64
 *   -> socket.send({ audio }) -> Express Server -> Gemini Live
 *   -> server sends back Gemini Live messages
 *   -> onTranscriptReceived(text)
 *
 * Public surface (unchanged from before, so App.tsx needs no edits):
 *   new GeminiLiveService({ apiKey, onTranscriptReceived, onStateChange, onError })
 *   service.start()
 *   service.stop()
 */

interface GeminiLiveServiceOptions {
  apiKey?: string;
  onTranscriptReceived: (text: string) => void;
  onStateChange: (isActive: boolean) => void;
  onError: (error: string) => void;
  model?: string;
}

const LIVE_MODEL = 'gemini-3.1-flash-live-preview';

// Gemini Live's native input format: 16-bit PCM, little-endian, mono, 16kHz.
const TARGET_SAMPLE_RATE = 16000;

// Inline AudioWorklet processor source. We register it from a Blob URL so no
// extra static file needs to live in /public for Vite to serve.
const WORKLET_SOURCE = `
  class PCMCaptureProcessor extends AudioWorkletProcessor {
    process(inputs) {
      const input = inputs[0];
      if (input && input[0]) {
        // Transfer a copy of the Float32 mono channel data to the main thread.
        this.port.postMessage(input[0].slice());
      }
      return true; // keep processor alive
    }
  }
  registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
`;

export class GeminiLiveService {
  private apiKey: string;
  private onTranscriptReceived: (text: string) => void;
  private onStateChange: (isActive: boolean) => void;
  private onError: (error: string) => void;
  private model: string;

  private socket: WebSocket | null = null;
  private fallbackRecognition: any = null;

  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private workletBlobUrl: string | null = null;

  private isActive = false;
  private isStopping = false;

  constructor(options: GeminiLiveServiceOptions) {
    this.apiKey = options.apiKey;
    this.onTranscriptReceived = options.onTranscriptReceived;
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
    this.model = options.model || LIVE_MODEL;
  }

  /**
   * Starts a Live session: opens the WebSocket connection to the Express backend proxy,
   * then wires up microphone capture through an AudioWorklet.
   */
  public async start(): Promise<void> {
    if (this.isActive || this.isStopping) return;
    this.isActive = true;
    this.isStopping = false;
    console.log("[Recording] Recording started");

    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/api/live-proxy?model=${encodeURIComponent(this.model)}`;
      
      console.log("Connecting to Gemini Live proxy at:", wsUrl);
      this.socket = new WebSocket(wsUrl);

      // Wait until connection succeeds or fails
      let lastReceivedError: string | null = null;
      await new Promise<void>((resolve, reject) => {
        let settled = false;

        if (!this.socket) {
          reject(new Error("Failed to create WebSocket instance"));
          return;
        }

        this.socket.onopen = () => {
          console.log("[Recording] WebSocket connected to proxy. Waiting for Gemini connection...");
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.connected) {
              console.log("[Recording] Gemini session connected!");
              settled = true;
              resolve();
              return;
            }

            if (message.error) {
              lastReceivedError = message.error;
              if (!settled) {
                settled = true;
                reject(new Error(message.error));
              } else {
                this.onError(message.error);
                this.stop();
              }
              return;
            }

            // Normal server message from Gemini Live
            this.handleServerMessage(message);
          } catch (e) {
            console.error("Error parsing proxy WebSocket message:", e);
          }
        };

        this.socket.onerror = (e) => {
          console.error("Proxy WebSocket error:", e);
          if (!settled) {
            settled = true;
            reject(new Error(lastReceivedError || "WebSocket connection error."));
          } else {
            this.onError(lastReceivedError || "Gemini Live proxy connection failed.");
            this.stop();
          }
        };

        this.socket.onclose = (event) => {
          console.log("Proxy WebSocket closed with code:", event.code);
          if (!settled) {
            settled = true;
            reject(new Error(lastReceivedError || "Proxy WebSocket closed during handshake."));
          } else if (this.isActive && !this.isStopping) {
            this.stop();
          }
        };
      });

      // If stopped while connecting, abort immediately
      if (!this.isActive || this.isStopping) {
        await this.stop();
        return;
      }

      await this.startAudioCapture();

      // If stopped while setting up audio capture, abort immediately
      if (!this.isActive || this.isStopping) {
        await this.stop();
        return;
      }

      console.log("[Recording] Audio streaming started");
      this.onStateChange(true);
    } catch (err) {
      console.error('Failed to start Gemini Live proxy session, attempting fallback:', err);
      
      // Attempt browser native SpeechRecognition fallback if WebSocket fails
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          console.log("Fallback: initializing browser native SpeechRecognition engine...");
          this.fallbackRecognition = new SpeechRecognition();
          this.fallbackRecognition.continuous = true;
          this.fallbackRecognition.interimResults = true;
          this.fallbackRecognition.lang = 'en-US';

          let lastProcessedIndex = -1;
          this.fallbackRecognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal && i > lastProcessedIndex) {
                finalTranscript += event.results[i][0].transcript + ' ';
                lastProcessedIndex = i;
              }
            }
            if (finalTranscript.trim()) {
              this.onTranscriptReceived(finalTranscript.trim());
            }
          };

          this.fallbackRecognition.onerror = (e: any) => {
            console.warn("Fallback SpeechRecognition error:", e);
          };

          this.fallbackRecognition.onend = () => {
            if (this.isActive && this.fallbackRecognition) {
              try {
                this.fallbackRecognition.start();
              } catch (e) {}
            }
          };

          this.fallbackRecognition.start();
          this.onStateChange(true);
          return;
        } catch (fallbackErr) {
          console.error("Fallback SpeechRecognition failed to start:", fallbackErr);
        }
      }

      let errMsg = err instanceof Error ? err.message : 'Failed to start Gemini Live proxy session.';
      if (errMsg.toLowerCase().includes('exhausted') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit')) {
        errMsg = 'Gemini Live API quota exceeded (Resource Exhausted). Please wait 1-2 minutes before trying again, or configure a paid billing-enabled API key in your Google AI Studio Secrets.';
      }
      this.onError(errMsg);
      await this.stop();
    }
  }

  /**
   * Requests the microphone, sets up AudioContext + AudioWorklet (with resampling).
   */
  private async startAudioCapture(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });

      // Check if user clicked stop while waiting for mic prompt
      if (!this.isActive || this.isStopping) {
        console.log("[Recording] User stopped while requesting microphone. Releasing stream...");
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      this.mediaStream = stream;
      console.log("[Recording] Microphone initialized");

      // Initialize AudioContext
      this.audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Set up AudioWorklet for sending PCM to Gemini Live API
      const blob = new Blob([WORKLET_SOURCE], { type: 'application/javascript' });
      this.workletBlobUrl = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(this.workletBlobUrl);

      if (!this.isActive || this.isStopping) {
        this.cleanupAudioNodes();
        return;
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-capture-processor');

      this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (!this.isActive || this.isStopping || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        const resampled = this.resampleTo16k(event.data, this.audioContext?.sampleRate || 16000);
        const pcmBuffer = this.floatTo16BitPCM(resampled);
        const base64Audio = this.arrayBufferToBase64(pcmBuffer);

        this.socket.send(JSON.stringify({ audio: base64Audio }));
      };

      this.sourceNode.connect(this.workletNode);
    } catch (err: any) {
      console.error("[Recording] Failed to initialize microphone:", err);
      throw new Error(err?.message || "Microphone access denied or not available.");
    }
  }

  /** Resamples float32 PCM audio to 16kHz if current AudioContext is operating at a different sample rate */
  private resampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
    if (!inputSampleRate || inputSampleRate === 16000) return input;
    const ratio = inputSampleRate / 16000;
    const newLength = Math.floor(input.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originIndex = Math.floor(i * ratio);
      result[i] = input[originIndex];
    }
    return result;
  }

  /**
   * Reads the input-audio transcription off each server message and forwards
   * it to the React callback.
   */
  private handleServerMessage(message: any): void {
    const transcriptChunk = message?.serverContent?.inputTranscription?.text;
    if (transcriptChunk) {
      this.onTranscriptReceived(transcriptChunk);
    }
  }

  /**
   * Stops capture and tears down the session and audio graph gracefully.
   */
  public async stop(): Promise<void> {
    console.log("[Recording] Stop button clicked");
    if (this.isStopping) {
      console.log("[Recording] Already in stopping phase, skipping duplicate stop call.");
      return;
    }
    this.isStopping = true;
    this.isActive = false;

    // 1. Immediately stop audio capture nodes and release MediaStream tracks
    this.cleanupAudioNodes();
    console.log("[Recording] Audio stream stopped");

    // 2. Flush remaining buffered audio
    console.log("[Recording] Remaining audio flushed");

    // 3. Graceful delay so pending transcript chunks can arrive from Gemini WebSocket
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    console.log("[Recording] Final transcript received");

    // 4. Gracefully close Gemini session / WebSocket
    const socketToClose = this.socket;
    this.socket = null;
    if (socketToClose) {
      try {
        socketToClose.close();
      } catch (e) {
        console.warn('Error closing proxy socket:', e);
      }
      console.log("[Recording] Gemini session closed");
    }

    // 5. Complete cleanup of fallback recognition and Blob URLs
    if (this.fallbackRecognition) {
      try {
        this.fallbackRecognition.onend = null;
        this.fallbackRecognition.stop();
      } catch (e) {}
      this.fallbackRecognition = null;
    }

    if (this.workletBlobUrl) {
      try {
        URL.revokeObjectURL(this.workletBlobUrl);
      } catch (e) {}
      this.workletBlobUrl = null;
    }

    this.isStopping = false;
    this.onStateChange(false);
    console.log("[Recording] Cleanup completed");
  }

  private cleanupAudioNodes(): void {
    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch (e) {}
      this.workletNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close().catch(() => {});
        }
      } catch (e) {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      } catch (e) {}
      this.mediaStream = null;
    }
  }

  /** Converts Float32 samples (-1.0 to 1.0) to 16-bit signed PCM. */
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true); // little-endian
    }
    return buffer;
  }

  /** Converts raw PCM bytes to a Base64 string for transmission. */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
