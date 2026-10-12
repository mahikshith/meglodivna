const el = id => document.getElementById(id);
const time = seconds => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0')}:${Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`;

export function createCampaignUI(catalog, callbacks = {}) {
  const categories = { sword: catalog.SWORDS, gun: catalog.GUNS, armor: catalog.ARMORS, spell: catalog.SPELLS, relic: catalog.RELICS };
  const labels = { sword: 'BLADES', gun: 'FIREPOWER', armor: 'ARMOR', spell: 'SORCERY', relic: 'RELICS' };
  let category = 'sword', currentWorld = null, storySignature = '', previousFocus = null;
  const modal = el('catalogue'), storyPanel = el('story-panel');
  const name = (kind, id) => categories[kind]?.find(item => item.id === id)?.name || id || '—';
  const tint = value => typeof value === 'number' ? `#${value.toString(16).padStart(6, '0')}` : value;
  const close = () => { if (modal.open) modal.close(); };
  const refresh = world => {
    if (world) currentWorld = world;
    if (!currentWorld) return;
    const progress = currentWorld.progress || {}, player = currentWorld.player || {};
    el('catalogue-grid').replaceChildren();
    for (const item of categories[category] || []) {
      const unlocked = category === 'relic' ? (progress.collections || currentWorld.collections || []).includes(item.id) : (progress.unlocked?.[category] || currentWorld.unlocks?.[category] || []).includes(item.id);
      const equipped = category !== 'relic' && (player[category] || progress.equipped?.[category]) === item.id;
      const card = document.createElement('article'); card.className = `catalogue-item${unlocked ? '' : ' locked'}`;
      const image = document.createElement('img'); image.alt = ''; image.width = image.height = 48;
      const url = callbacks.iconUrl?.(`icon-${item.id}`); if (url) image.src = url;
      const title = document.createElement('h3'); title.textContent = item.name;
      const kind = document.createElement('span'); kind.className = 'item-kind'; kind.textContent = equipped ? 'EQUIPPED' : unlocked ? category === 'relic' ? 'RECOVERED' : 'AVAILABLE' : 'UNDISCOVERED';
      const description = document.createElement('p'); description.textContent = item.description || item.lore || '';
      const action = document.createElement(category === 'relic' ? 'div' : 'button');
      action.textContent = category === 'relic' ? unlocked ? 'RECOVERED RELIC' : 'EXPLORE TO RECOVER' : equipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : 'DISCOVER TO UNLOCK';
      if (category === 'relic') action.className = 'item-status';
      else { action.disabled = !unlocked || equipped; action.dataset.equipped = String(equipped); action.addEventListener('click', () => { callbacks.onEquip?.(category, item.id); refresh(currentWorld); }); }
      if (item.tint) title.style.color = tint(item.tint);
      card.append(image, title, kind, description, action); el('catalogue-grid').append(card);
    }
    for (const tab of el('catalogue-tabs').children) { const selected = tab.dataset.category === category; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; }
    el('catalogue-note').textContent = category === 'relic' ? 'Recovered relics remember the people this empire consumed.' : 'Equipment changes defense, resources and attack behavior. Discover caches and help survivors to unlock it.';
  };
  for (const key of Object.keys(categories)) {
    const tab = document.createElement('button'); tab.textContent = labels[key]; tab.dataset.category = key; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'catalogue-grid');
    tab.id = `catalogue-tab-${key}`;
    tab.addEventListener('click', () => { category = key; refresh(); el('catalogue-grid').setAttribute('aria-labelledby', tab.id); });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); const tabs = [...el('catalogue-tabs').children], index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? tabs.length - 1 : 1)) % tabs.length;
      tabs[next].click(); tabs[next].focus();
    });
    el('catalogue-tabs').append(tab);
  }
  const open = world => {
    if (storyPanel.open) return;
    refresh(world); if (!currentWorld || modal.open) return;
    previousFocus = document.activeElement; callbacks.onOpen?.(); modal.showModal(); el('catalogue-close').focus();
  };
  el('armory').addEventListener('click', () => open()); el('catalogue-close').addEventListener('click', close);
  modal.addEventListener('close', () => { callbacks.onClose?.(); previousFocus?.focus?.({ preventScroll: true }); });
  storyPanel.addEventListener('cancel', event => event.preventDefault());
  el('story-next').addEventListener('click', () => callbacks.onStoryNext?.());

  const renderStory = story => {
    if (!story) { storySignature = ''; if (storyPanel.open) storyPanel.close(); return; }
    const signature = `${story.npcId}:${story.index}:${story.choices?.map(choice => choice.id).join(',')}`;
    if (signature === storySignature) return; storySignature = signature;
    const line = story.lines?.[story.index || 0] || {}, final = (story.index || 0) >= (story.lines?.length || 1) - 1;
    el('story-speaker').textContent = line.speaker || story.speaker || 'SURVIVOR';
    el('story-text').textContent = line.text || (typeof line === 'string' ? line : '');
    const portrait = callbacks.iconUrl?.(`portrait-${story.npcId}`); if (portrait) el('story-portrait').src = portrait;
    el('story-choices').replaceChildren();
    if (final) for (const choice of story.choices || []) {
      const button = document.createElement('button'); button.textContent = choice.label; button.addEventListener('click', () => callbacks.onStoryChoice?.(choice.id)); el('story-choices').append(button);
    }
    el('story-next').hidden = final && !!story.choices?.length;
    el('story-next').textContent = final ? 'RETURN TO THE FRONTIER ↗' : 'CONTINUE ↗';
    if (!storyPanel.open) { close(); storyPanel.showModal(); }
    (el('story-choices').firstElementChild || el('story-next')).focus();
  };
  const renderHUD = world => {
    currentWorld = world;
    const player = world.player;
    el('mana-bar').style.width = `${Math.max(0, Math.min(100, player.mana / (player.maxMana || 100) * 100))}%`;
    el('mana-value').textContent = Math.ceil(player.mana || 0);
    el('equipped').textContent = `${name('sword', player.sword)} / ${name('gun', player.gun)} / ${name('spell', player.spell)} · ${name('armor', player.armor)} · CANNON ${player.charges?.cannon || 0} / NOVA ${player.charges?.nova || 0}`;
    el('countdown').textContent = time(world.timeLeft || 0); el('countdown').parentElement.classList.toggle('urgent', world.timeLeft < 60);
    el('missile-warning').hidden = !world.missileWarning || world.status !== 'playing';
    if (world.missileWarning) el('missile-count').textContent = `${Math.max(0, world.missileWarning.time).toFixed(1)}s`;
  };
  return { open, close, refresh, renderHUD, renderStory };
}
