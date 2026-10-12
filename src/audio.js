export class Sound {
  constructor() { this.muted = false; this.ctx = null; this.nextBeat = 0; this.beat = 0; }
  async start() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.ctx = new Context(); this.master = this.ctx.createGain(); this.master.gain.value = 0.28; this.master.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }
  tone(frequency, endFrequency, length, volume, type = 'triangle', delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, t); osc.frequency.exponentialRampToValueAtTime(Math.max(10,endFrequency),t+length);
    gain.gain.setValueAtTime(volume,t); gain.gain.exponentialRampToValueAtTime(0.001,t+length);
    osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t+length+.01);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  hiss(length, volume, frequency = 1400) {
    if (!this.ctx || this.muted) return;
    const t=this.ctx.currentTime, src=this.ctx.createBufferSource(), filter=this.ctx.createBiquadFilter(), gain=this.ctx.createGain();
    src.buffer=this.noise; filter.type='highpass'; filter.frequency.value=frequency; gain.gain.setValueAtTime(volume,t); gain.gain.exponentialRampToValueAtTime(.001,t+length);
    src.connect(filter); filter.connect(gain); gain.connect(this.master); src.start(t); src.stop(t+length);
    src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  }
  play(event) {
    switch(event) {
      case 'shot':this.tone(140,40,.075,.15,'square');this.hiss(.05,.13,2400);break;
      case 'enemyshot':this.tone(110,40,.1,.08,'sawtooth');break;
      case 'slash':this.hiss(.15,.17,700);this.tone(420,70,.12,.07);break;
      case 'jump':case 'walljump':this.tone(120,360,.12,.08);break;
      case 'dash':this.hiss(.15,.12,1300);break;
      case 'land':this.hiss(.05,.06,400);break;
      case 'hit':case 'parry':this.tone(780,160,.06,.16,'square');this.hiss(.09,.1);break;
      case 'explode':case 'death':this.hiss(.5,.25,100);this.tone(100,20,.4,.3,'sawtooth');break;
      case 'hurt':this.tone(180,35,.25,.22,'sawtooth');break;
      case 'pickup':case 'checkpoint':this.tone(440,440,.17,.1);this.tone(660,660,.2,.09,'triangle',.09);break;
      case 'emp':this.tone(700,45,.45,.12,'sawtooth');break;
      case 'charge':this.tone(100,700,.5,.08,'sawtooth');break;
      case 'win':this.tone(330,330,.5,.13);this.tone(440,440,.5,.1,'triangle',.2);this.tone(660,660,.8,.13,'triangle',.4);break;
    }
  }
  update(active, intense) {
    if (!this.ctx || this.muted || !active) { this.nextBeat = this.ctx?.currentTime || 0; return; }
    const now=this.ctx.currentTime;
    if (this.nextBeat < now) this.nextBeat=now;
    if (this.nextBeat > now+.1) return;
    const bass=[55,55,65.4,49][Math.floor(this.beat/8)%4],delay=this.nextBeat-now;
    this.tone(bass,bass,.45,.045,'triangle',delay);
    if (this.beat%2===0) this.tone(95,25,.16,intense?.09:.055,'sine',delay);
    if (this.beat%4===2) this.tone(bass*4,bass*4,.6,.018,'triangle',delay);
    this.nextBeat+=intense?.27:.36;this.beat++;
  }
  setMuted(value) { this.muted=value; if(this.master)this.master.gain.value=value?0:.28; }
}
