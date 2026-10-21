(function(root) {
  'use strict';
  class SpeechInput {
    constructor(Recognition, callbacks) { this.Recognition=Recognition; this.callbacks=callbacks; this.active=false; }
    start(language) {
      if (!this.Recognition) throw Error('Speech recognition is unavailable. Type or paste instead.');
      if(this.active)return;
      this.language=language;this.active=true;this.stopping=false;this.failed=false;this.emptyEnds=0;this.pending='';this.stopPromise=null;
      try{this.listen();}catch(error){this.abort();throw error;}
    }
    listen() {
      if(!this.active||this.stopping)return;
      const recognition=new this.Recognition();this.recognition=recognition;
      const finalized=new Set();this.pending='';
      recognition.lang=this.language;recognition.continuous=true;recognition.interimResults=true;
      recognition.onstart=()=>{if(this.active)this.callbacks.onStatus('Listening…');};
      recognition.onresult=event=>{
        if(!this.active||this.recognition!==recognition)return;
        let interim='';
        for(let i=0;i<event.results.length;i++){
          const result=event.results[i],text=result[0].transcript.trim();
          if(result.isFinal&&!finalized.has(i)){finalized.add(i);if(text){this.emptyEnds=0;this.callbacks.onText(text);}}
          else if(!result.isFinal)interim+=text+' ';
        }
        this.pending=interim.trim();this.callbacks.onInterim(this.pending);
      };
      recognition.onerror=event=>{
        if(!this.active)return;
        if(event.error==='no-speech'&&!this.stopping){this.callbacks.onStatus('Still listening…');return;}
        const messages={'not-allowed':'Microphone permission denied. Type instead.','service-not-allowed':'Speech service unavailable. Type instead.','audio-capture':'No microphone available.','network':'Speech service disconnected. Your text is kept.','language-not-supported':'This language is unavailable. Try another.'};
        this.failed=true;this.stopping=true;if(!this.stopPromise)this.stopPromise=new Promise(resolve=>{this.resolveStop=resolve;});this.callbacks.onStatus(messages[event.error]||'Dictation stopped. Review your text.',true);
        clearTimeout(this.endTimer);this.endTimer=setTimeout(()=>{recognition.abort();this.finish();},1200);
      };
      recognition.onend=()=>{
        if(!this.active||this.recognition!==recognition)return;
        if(this.pending){this.callbacks.onText(this.pending);this.pending='';}
        if(this.stopping){this.finish();return;}
        if(++this.emptyEnds>3){this.failed=true;this.callbacks.onStatus('No speech received. Check your microphone and try again.',true);this.finish();return;}
        this.callbacks.onInterim('');this.callbacks.onStatus('Still listening…');
        this.restartTimer=setTimeout(()=>{this.restartTimer=null;try{this.listen();}catch(error){this.failed=true;this.callbacks.onStatus('Could not resume dictation. Your text is kept.',true);this.finish();}},300);
      };
      recognition.start();
    }
    finish(){
      if(!this.active)return;
      clearTimeout(this.restartTimer);clearTimeout(this.endTimer);this.active=false;this.stopping=false;
      if(this.pending){this.callbacks.onText(this.pending);this.pending='';}
      const r=this.recognition;if(r){r.onresult=null;r.onerror=null;r.onend=null;r.onstart=null;}
      this.callbacks.onInterim('');if(!this.failed)this.callbacks.onStatus('Microphone stopped. Review your transcript.');
      this.callbacks.onEnd();this.resolveStop?.();this.resolveStop=null;
    }
    stop(){
      if(!this.active)return Promise.resolve();if(this.stopping)return this.stopPromise||Promise.resolve();
      this.stopping=true;this.callbacks.onStatus('Finishing…');
      this.stopPromise=new Promise(resolve=>{this.resolveStop=resolve;});
      if(this.restartTimer){clearTimeout(this.restartTimer);this.restartTimer=null;this.finish();return this.stopPromise;}
      this.endTimer=setTimeout(()=>{if(this.pending){this.callbacks.onText(this.pending);this.pending='';}this.recognition?.abort();this.finish();},1500);
      try{this.recognition.stop();}catch(error){this.recognition.abort();this.finish();}
      return this.stopPromise;
    }
    abort(){
      clearTimeout(this.restartTimer);clearTimeout(this.endTimer);this.active=false;this.stopping=false;
      const r=this.recognition;if(r){r.onresult=null;r.onerror=null;r.onend=null;r.onstart=null;r.abort();}
      this.resolveStop?.();this.resolveStop=null;
    }
  }
  root.DaydreamSpeechInput=SpeechInput;
  if(typeof module!=='undefined'&&module.exports)module.exports={SpeechInput};
})(typeof window!=='undefined'?window:globalThis);
