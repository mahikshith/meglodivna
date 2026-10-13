const el = id => document.getElementById(id);
const time = seconds => `${Math.floor(Math.max(0, seconds) / 60).toString().padStart(2, '0')}:${Math.floor(Math.max(0, seconds) % 60).toString().padStart(2, '0')}`;

export function createCampaignUI(catalog, callbacks = {}) {
  const categories = { sword: catalog.SWORDS, gun: catalog.GUNS, armor: catalog.ARMORS, spell: catalog.SPELLS, relic: catalog.RELICS };
  const labels = { sword: 'BLADES', gun: 'FIREPOWER', armor: 'ARMOR', spell: 'SORCERY', relic: 'RELICS' };
  let category = 'sword', currentWorld = null, storySignature = '', previousFocus = null;
  const modal = el('catalogue'), storyPanel = el('story-panel');
  const runeStatus = el('rune-status'), runeIcons = [...(runeStatus?.querySelectorAll('[data-rune]') || [])];
  const opacity = el('control-opacity');
  if (opacity) {
    const applyOpacity = value => {
      const amount = Math.max(40, Math.min(100, Number(value) || 80));
      opacity.value = String(amount); el('control-opacity-value').textContent = `${amount}%`;
      el('touch').style.setProperty('--touch-opacity', String(amount / 100));
      opacity.setAttribute('aria-valuetext', `${amount} percent`);
    };
    try { applyOpacity(localStorage.getItem('runeheart-touch-opacity') || 80); } catch { applyOpacity(80); }
    opacity.addEventListener('input', () => { applyOpacity(opacity.value); try { localStorage.setItem('runeheart-touch-opacity', opacity.value); } catch {} });
  }
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
      const traits = document.createElement('p'); traits.className = 'item-traits';
      traits.textContent = category === 'spell' ? `${item.charge ? `1 ${item.charge} charge` : `${item.cost || 0} resonance`} · ${item.cooldown}s recovery${item.duration ? ` · ${item.duration}s duration` : ''}`
        : category === 'armor' ? `${item.maxHp} health · ${item.maxMana} resonance · ${Math.round((1 - item.damageTaken) * 100)}% resistance · ${item.fuelRate}× fuel drain`
        : category === 'gun' || category === 'sword' ? `${item.damage}${item.pellets ? ` × ${item.pellets}` : ''} damage · ${item.cooldown}s recovery${item.pierce ? ` · pierces ${item.pierce}` : ''}${item.cost ? category === 'gun' && item.id === 'cannon' ? ' · 1 cannon charge' : ` · ${item.cost} resonance` : ''}` : '';
      card.append(image, title, kind, description); if (traits.textContent) card.append(traits); card.append(action); el('catalogue-grid').append(card);
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
  el('touch')?.addEventListener('open-loadout', () => { category = 'spell'; open(); });
  modal.addEventListener('close', () => { callbacks.onClose?.(); previousFocus?.focus?.({ preventScroll: true }); });
  storyPanel.addEventListener('cancel', event => event.preventDefault());
  el('story-next').addEventListener('click', () => callbacks.onStoryNext?.());

  const renderStory = story => {
    if (!story) { storySignature = ''; if (storyPanel.open) storyPanel.close(); return; }
    const signature = `${story.npcId}:${story.index}:${story.choices?.map(choice => choice.id).join(',')}`;
    if (signature === storySignature) return; storySignature = signature;
    const line = story.lines?.[story.index || 0] || {}, final = (story.index || 0) >= (story.lines?.length || 1) - 1;
    el('story-speaker').textContent = line.speaker === 'COURIER' ? 'AETHER' : line.speaker || story.speaker || 'SURVIVOR';
    el('story-text').textContent = line.text || (typeof line === 'string' ? line : '');
    const portraitKey = story.portrait || `portrait-${story.npcId}`;
    const portrait = callbacks.iconUrl?.(portraitKey.startsWith('portrait-') ? portraitKey : `portrait-${portraitKey}`); if (portrait) el('story-portrait').src = portrait;
    el('story-choices').replaceChildren();
    if (final) for (const choice of story.choices || []) {
      const button = document.createElement('button'); button.textContent = choice.label; button.addEventListener('click', () => callbacks.onStoryChoice?.(choice.id)); el('story-choices').append(button);
    }
    el('story-next').hidden = final && !!story.choices?.length;
    el('story-next').textContent = final ? 'Return to the frontier →' : 'Continue →';
    if (!storyPanel.open) { close(); storyPanel.showModal(); }
    (el('story-choices').firstElementChild || el('story-next')).focus();
  };
  const renderHUD = world => {
    currentWorld = world;
    const player = world.player;
    const collections = world.collections || world.progress?.collections || [];
    let recoveredRunes = 0;
    for (const icon of runeIcons) {
      const recovered = collections.includes(icon.dataset.rune); if (recovered) recoveredRunes++;
      icon.dataset.recovered = String(recovered);
      icon.setAttribute('aria-label', `${name('relic', icon.dataset.rune)}: ${recovered ? 'recovered' : 'not recovered'}`);
    }
    runeStatus?.setAttribute('aria-label', `Rune stones: ${recoveredRunes} of 3 recovered`);
    el('mana-bar').style.width = `${Math.max(0, Math.min(100, player.mana / (player.maxMana || 100) * 100))}%`;
    el('mana-value').textContent = Math.ceil(player.mana || 0);
    el('equipped').textContent = `${name('sword', player.sword)} / ${name('gun', player.gun)} / ${name('spell', player.spell)} · ${name('armor', player.armor)} · CANNON ${player.charges?.cannon || 0} / NOVA ${player.charges?.nova || 0}`;
    const selectedSpell = catalog.SPELLS.find(spell => spell.id === player.spell);
    const state = (action, ready, cooling = false) => {
      const button = el('touch').querySelector(`[data-action="${action}"]`); if (!button) return;
      button.dataset.ready = String(ready); button.dataset.cooling = String(cooling); button.setAttribute('aria-disabled', String(!ready));
    };
    state('power', player.spellCooldown <= 0 && (selectedSpell?.charge ? player.charges?.[selectedSpell.charge] > 0 : player.mana >= (selectedSpell?.cost || 0)), player.spellCooldown > 0);
    state('dash', player.dashCooldown <= 0, player.dashCooldown > 0);
    const near = target => !target.dead && Math.abs(target.x - player.x) < 110 && Math.abs(target.y - player.y) < 100;
    const nearby = (world.npcs || []).some(near) || (world.props || []).some(prop => ['lever','valve','conduit'].includes(prop.type) && !prop.used && near(prop)) || (world.level?.portals || []).some(near);
    el('touch').dataset.interact = String(nearby);
    const power = el('touch-power');
    if (power) {
      power.dataset.nearby = String(nearby);
      power.setAttribute('aria-label', nearby ? 'Interact with nearby character or mechanism; hold for loadout' : `Cast ${selectedSpell?.name || 'power'}; hold for loadout`);
      if (nearby) state('power', true);
      const powerName = el('touch-power-name'), powerCost = el('touch-power-cost');
      if (powerName) powerName.textContent = nearby ? 'INTERACT' : selectedSpell?.name || 'SORCERY';
      if (powerCost) powerCost.textContent = nearby ? 'TAP TO USE' : player.spellCooldown > 0 ? `${Math.ceil(player.spellCooldown)}s recovery` : selectedSpell?.charge ? `${player.charges?.[selectedSpell.charge] || 0} charges` : `${selectedSpell?.cost || 0} soul`;
    }
    el('countdown').textContent = time(world.timeLeft || 0); el('countdown').parentElement.classList.toggle('urgent', world.timeLeft < 60);
    el('missile-warning').hidden = !world.missileWarning || world.status !== 'playing';
    if (world.missileWarning) {
      el('missile-count').textContent = 'Incoming heavy attack from the right';
      el('missile-warning').style.top = `${Math.max(15, Math.min(82, world.missileWarning.y / (world.level?.height || 720) * 100))}%`;
    }
  };
  return { open, close, refresh, renderHUD, renderStory };
}
