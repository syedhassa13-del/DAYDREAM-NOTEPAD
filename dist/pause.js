(function() {
  'use strict';
  const dialog = document.createElement('dialog'); dialog.id = 'pause-dialog'; dialog.setAttribute('aria-labelledby', 'pause-title');
  dialog.innerHTML = '<form id="pause-form"><p class="eyebrow">A MOMENT FOR THE PRESENT</p><h2 id="pause-title">Pause and return to now.</h2><p>Your story can stay on the page while you take a moment for your day.</p><label for="pause-place">Where are you right now? <span>(optional)</span></label><input id="pause-place" autocomplete="off" placeholder="Notice the room or place around you."><label for="pause-next">What would you like to do next? <span>(optional)</span></label><input id="pause-next" autocomplete="off" placeholder="A small thing you want to do in your day."><p class="field-help">These reflections are optional and aren’t saved.</p><div class="dialog-actions"><button type="button" class="secondary-button" id="pause-continue">Keep writing</button><button type="button" class="button" id="pause-finish">Return to your day</button></div></form>'; document.body.append(dialog);
  document.addEventListener('click', async event => {
    if (!event.target.closest('[data-pause]')) return;
    if (!await window.DaydreamStoryEditor.beforeNavigate() || !await window.DaydreamCapture.prepareAction()) return;
    dialog.showModal();
  });
  document.getElementById('pause-continue').addEventListener('click', () => dialog.close());
  document.getElementById('pause-finish').addEventListener('click', () => { dialog.close(); location.hash = 'home'; });
  dialog.addEventListener('close', () => document.getElementById('pause-form').reset());
})();
