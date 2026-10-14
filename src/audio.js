export class Sound {
  constructor() { this.muted = false; this.reducedFX = false; this.ctx = null; this.nextBeat = 0; this.beat = 0; this.activeVoices = 0; this.musicVolume = .7; this.sfxVolume = .8; }
  async start() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.ctx = new Context(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.28; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVolume; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVolume; this.sfxGain.connect(this.master);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }
  tone(frequency, endFrequency, length, volume, type = 'triangle', delay = 0, channel = 'sfx') {
    if (!this.ctx || this.muted || this.activeVoices >= 24) return;
    this.activeVoices++;
    const t = this.ctx.currentTime + delay, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, t); osc.frequency.exponentialRampToValueAtTime(Math.max(10,endFrequency),t+length);
    gain.gain.setValueAtTime(volume,t); gain.gain.exponentialRampToValueAtTime(0.001,t+length);
    osc.connect(gain); gain.connect(channel === 'music' ? this.musicGain : this.sfxGain); osc.start(t); osc.stop(t+length+.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.activeVoices--; };
  }
  hiss(length, volume, frequency = 1400, type = 'highpass', delay = 0) {
    if (!this.ctx || this.muted || this.activeVoices >= 24) return;
    this.activeVoices++;
    const t=this.ctx.currentTime+delay, src=this.ctx.createBufferSource(), filter=this.ctx.createBiquadFilter(), gain=this.ctx.createGain();
    src.buffer=this.noise; filter.type=type; filter.frequency.value=frequency; gain.gain.setValueAtTime(volume,t); gain.gain.exponentialRampToValueAtTime(.001,t+length);
    src.connect(filter); filter.connect(gain); gain.connect(this.sfxGain); src.start(t); src.stop(t+length);
    src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();this.activeVoices--;};
  }
  play(event, detail) {
    const data=typeof event==='object'&&event?event:{};
    if (typeof event === 'object') { detail=event?.spell||event?.kind;event=event?.type; }
    if (event==='spell' && detail) event=detail;
    if(event==='shot'&&data.gun)event=data.gun;
    if(event==='pickup'&&data.kind==='shield')event='shield';
    switch(event) {
      case 'shot':case 'carbine':this.tone(140,40,.075,.15,'square');this.hiss(.05,.13,2400);break;
      case 'scatter':this.hiss(.16,.22,700,'bandpass');this.tone(155,30,.15,.19,'sawtooth');this.hiss(.07,.08,3200,'highpass',.07);break;
      case 'rail':this.tone(1400,170,.16,.13,'triangle');this.hiss(.09,.17,3800);this.tone(75,22,.13,.14,'sine');break;
      case 'rocket':this.hiss(.25,.19,400,'bandpass');this.tone(95,220,.2,.13,'sawtooth');break;
      case 'enemyshot':this.tone(110,40,.1,.08,'sawtooth');break;
      case 'slash':{
        const heavy=data.style==='finisher'||data.attackStyle==='finisher'||data.combo===2;
        this.hiss(heavy ? .22 : .14,heavy ? .21 : .16,heavy?550:1400,'bandpass');this.tone(heavy?260:740,heavy?35:120,heavy ? .19 : .11,heavy ? .15 : .09,'triangle');break;
      }
      case 'shield':this.tone(180,720,.26,.1,'sine');this.tone(530,1060,.32,.08,'triangle',.04);this.hiss(.12,.04,3200);break;
      case 'summon':{
        const base=data.summon==='dragon'?65:data.summon==='wolf'?190:300;
        this.tone(base,base*2.4,.35,.11,'triangle');this.tone(base*1.5,base*3,.4,.07,'sine',.06);this.hiss(.2,.065,900,'bandpass');break;
      }
      case 'spike':case 'trap':this.hiss(.12,.11,650,'bandpass');this.tone(330,100,.11,.1,'square');break;
      case 'jump':case 'walljump':this.tone(120,360,.12,.08);break;
      case 'dash':this.hiss(.15,.12,1300);break;
      case 'land':this.hiss(.05,.06,400);break;
      case 'hit':case 'parry':this.tone(780,160,.06,.16,'square');this.hiss(.09,.1);break;
      case 'explode':case 'death':this.hiss(.5,.25,100);this.tone(100,20,.4,.3,'sawtooth');break;
      case 'hurt':this.tone(180,35,.25,.22,'sawtooth');break;
      case 'pickup':case 'checkpoint':case 'storyreward':this.tone(440,440,.17,.1);this.tone(660,660,.2,.09,'triangle',.09);break;
      case 'emp':this.tone(700,45,.45,.12,'sawtooth');break;
      case 'charge':this.tone(100,700,.5,.08,'sawtooth');break;
      case 'thunder':this.hiss(this.reducedFX ? .3 : .7,.22,700,'lowpass');this.tone(70,22,.45,.22,'sine');this.hiss(.08,.15,2900);break;
      case 'cannon':case 'laser':this.tone(80,480,.25,.21,'sawtooth');this.tone(680,60,.4,.14,'square',.04);this.hiss(.3,.1,3200);break;
      case 'cinder':case 'burn':this.hiss(.5,.13,800,'bandpass');this.tone(210,45,.3,.11,'sawtooth');break;
      case 'siphon':this.tone(90,380,.4,.12,'sine');this.tone(133,390,.34,.06,'triangle',.06);break;
      case 'veil':this.hiss(.28,.09,2900);this.tone(300,95,.35,.07,'sine');break;
      case 'stasis':this.tone(840,110,.45,.09,'triangle');this.tone(550,70,.3,.07,'sine',.05);break;
      case 'eclipse':case 'nova':this.tone(48,25,.7,.25,'sine');this.hiss(this.reducedFX ? .3 : .8,.18,450,'lowpass');this.tone(920,140,.6,.09,'triangle',.07);break;
      case 'destroy':case 'break':case 'debris':this.hiss(.28,.17,450,'bandpass');this.tone(220,32,.22,.16,'sawtooth');this.tone(720,340,.11,.07,'triangle',.07);break;
      case 'missile':case 'missile-warning':case 'missilewarning':case 'warning':this.tone(650,650,.1,.09,'square');this.tone(490,490,.12,.08,'square',.16);break;
      case 'gate':this.hiss(.35,.13,650,'bandpass');this.tone(95,45,.4,.1,'sawtooth');break;
      case 'bossdead':case 'bossdefeated':this.hiss(.7,.22,550,'lowpass');this.tone(68,24,.6,.2,'sine');this.tone(420,140,.45,.08,'triangle',.12);break;
      case 'alarm':this.tone(320,460,.2,.08,'triangle');break;
      case 'interact':case 'story':this.tone(240,240,.15,.08);this.tone(360,360,.2,.06,'triangle',.07);break;
      case 'equip':this.tone(180,450,.11,.09);this.hiss(.07,.05,2200);break;
      case 'win':this.tone(330,330,.5,.13);this.tone(440,440,.5,.1,'triangle',.2);this.tone(660,660,.8,.13,'triangle',.4);break;
    }
  }
  update(active, intense) {
    if (!this.ctx || this.muted || !active) { this.nextBeat = this.ctx?.currentTime || 0; return; }
    const now=this.ctx.currentTime;
    if (this.nextBeat < now) this.nextBeat=now;
    if (this.nextBeat > now+.1) return;
    const bass=[55,55,65.4,49][Math.floor(this.beat/8)%4],delay=this.nextBeat-now;
    this.tone(bass,bass,.45,.045,'triangle',delay,'music');
    if (this.beat%2===0) this.tone(95,25,.16,intense?.09:.055,'sine',delay,'music');
    if (this.beat%4===2) this.tone(bass*4,bass*4,.6,.018,'triangle',delay,'music');
    this.nextBeat+=intense?.27:.36;this.beat++;
  }
  setMuted(value) { this.muted=value; if(this.master)this.master.gain.value=value?0:.28; }
  setMusicVolume(value) { this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0)); if(this.musicGain)this.musicGain.gain.value=this.musicVolume; }
  setSfxVolume(value) { this.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0)); if(this.sfxGain)this.sfxGain.gain.value=this.sfxVolume; }
  setReducedFX(value) { this.reducedFX=!!value; }
}
