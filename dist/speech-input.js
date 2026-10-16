(function(root) {
  'use strict';
  class SpeechInput {
    constructor(Recognition, callbacks) { this.Recognition = Recognition; this.callbacks = callbacks; this.active = false; }
    start(language) {
      if (!this.Recognition) throw new Error('Speech recognition is unavailable in this browser. Type or paste your transcript instead.');
      if (this.active) return;
      const recognition = new this.Recognition(); this.recognition = recognition; this.active = true;
      this.stopping = false; this.failed = false;
      const finalized = new Set();
      recognition.lang = language; recognition.continuous = true; recognition.interimResults = true;
      recognition.onstart = () => { if (this.active) this.callbacks.onStatus('Listening. Speak at your own pace.'); };
      recognition.onresult = event => {
        if (!this.active) return;
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i], text = result[0].transcript.trim();
          if (result.isFinal && !finalized.has(i)) { finalized.add(i); if (text) this.callbacks.onText(text); }
          else if (!result.isFinal) interim += `${text} `;
        }
        this.callbacks.onInterim(interim.trim());
      };
      recognition.onerror = event => {
        const messages = { 'not-allowed': 'Microphone permission was denied. You can type or paste instead.', 'service-not-allowed': 'The browser speech service is unavailable. You can type or paste instead.', 'audio-capture': 'No microphone is available. You can type or paste instead.', 'network': 'The speech service could not connect. Your existing text is still here.', 'no-speech': 'No speech was detected. Try again, or type your thought.', 'language-not-supported': 'This speech service does not support the selected language. Try another language or type instead.' };
        this.callbacks.onStatus(messages[event.error] || 'Speech recognition stopped. Your existing text is still here.', true);
        this.callbacks.onInterim(''); this.failed = true;
      };
      recognition.onend = () => { this.active = false; this.stopping = false; this.callbacks.onInterim(''); if (!this.failed) this.callbacks.onStatus('Microphone stopped. Review and edit your transcript.'); this.failed = false; this.callbacks.onEnd(); };
      try { recognition.start(); } catch(error) { this.active = false; throw error; }
    }
    stop() { if (this.active && !this.stopping) { this.stopping = true; this.callbacks.onStatus('Stopping microphone…'); try { this.recognition.stop(); } catch(error) { this.abort(); this.callbacks.onStatus('The microphone stopped. Your existing text is still here.', true); this.callbacks.onEnd(); } } }
    abort() { if (this.active) { this.active = false; this.recognition.onresult = null; this.recognition.onerror = null; this.recognition.onend = null; this.recognition.abort(); } }
  }
  root.DaydreamSpeechInput = SpeechInput;
  if (typeof module !== 'undefined' && module.exports) module.exports = { SpeechInput };
})(typeof window !== 'undefined' ? window : globalThis);
