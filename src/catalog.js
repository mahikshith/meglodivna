export const DIFFICULTIES = [
  { id: 'ember', name: 'Ember', label: 'Easy', description: 'Forgiving wounds and generous recovery.', damage: 0.65, enemyHealth: 0.8, cadence: 1.25, missilePeriod: 22, recovery: 1.35, deadline: 660 },
  { id: 'forge', name: 'Forge', label: 'Medium', description: 'The intended balance of steel and soul.', damage: 1, enemyHealth: 1, cadence: 1, missilePeriod: 17, recovery: 1, deadline: 510 },
  { id: 'inferno', name: 'Inferno', label: 'Hard', description: 'Hardened foes, faster attacks, scarce recovery.', damage: 1.25, enemyHealth: 1.2, cadence: 0.85, missilePeriod: 13, recovery: 0.8, deadline: 450 },
  { id: 'extinction', name: 'Extinction', label: 'Ultra hard', description: 'Merciless damage and relentless missile pressure.', damage: 1.55, enemyHealth: 1.4, cadence: 0.72, missilePeriod: 10, recovery: 0.6, deadline: 390 },
];
export const SWORDS = [
  { id: 'rustfang', name: 'Rustfang', description: 'Horizontal, vertical, then heavy finisher. Borrowed Spark: light parries grant five resonance, at most twice per swing; heavy attacks cannot be parried.', tint: 0xeab76f, damage: 27, cooldown: 0.28, width: 90, height: 135 },
  { id: 'katana', name: 'Storm Katana', description: 'Fast alternating cuts; the third strike chains lightning. Borrowed Spark: each light parry grants five resonance, at most twice per swing.', tint: 0x82e8ff, damage: 23, cooldown: 0.22, width: 96, height: 145 },
  { id: 'saber', name: 'Soul Saber', description: 'A broad blade that steals life. Borrowed Spark: each light parry grants five resonance, at most twice per swing.', tint: 0xc49bff, damage: 35, cooldown: 0.36, width: 100, height: 155 },
];
export const GUNS = [
  { id: 'carbine', name: 'Ash Carbine', description: 'Reliable rapid kinetic fire.', tint: 0xeab76f, damage: 8, cooldown: 0.17, speed: 920 },
  { id: 'scatter', name: 'Grave Scattergun', description: 'Five short-range pellets punish close threats.', tint: 0xff9b65, damage: 6, cooldown: 0.5, speed: 720, pellets: 5 },
  { id: 'rail', name: 'Storm Rail', description: 'High-speed rounds pierce three targets.', tint: 0x82e8ff, damage: 28, cooldown: 0.65, speed: 1600, pierce: 3 },
  { id: 'rocket', name: 'Cinder Launcher', description: 'Heavy explosive rockets consume four resonance each.', tint: 0xff825f, damage: 30, cooldown: 0.7, speed: 480, cost: 4 },
  { id: 'cannon', name: 'Oblivion Cannon', description: 'One charge erases foes and destructible cover along a huge soul beam.', tint: 0xc49bff, damage: 100, cooldown: 0.9, range: 1800, cost: 1 },
];
export const ARMORS = [
  { id: 'courier', name: 'Courier Rig', description: 'Balanced protection, resonance, and fuel economy.', tint: 0xeab76f, maxHp: 100, maxMana: 100, damageTaken: 1, fuelRate: 1 },
  { id: 'bulwark', name: 'Bulwark Plate', description: 'More health and 22% damage resistance; less resonance and faster fuel drain.', tint: 0xbec9d1, maxHp: 135, maxMana: 80, damageTaken: 0.78, fuelRate: 1.3 },
  { id: 'wraith', name: 'Wraith Weave', description: 'Larger resonance reserve and efficient thrusters; fragile against direct hits.', tint: 0xc49bff, maxHp: 85, maxMana: 140, damageTaken: 1.1, fuelRate: 0.8 },
];
export const SPELLS = [
  { id: 'cinder', name: 'Cinder Plague', description: 'Ignite every living soldier for five seconds.', tint: 0xff825f, cost: 45, cooldown: 5, duration: 5 },
  { id: 'siphon', name: 'Soul Siphon', description: 'Rip nearby souls and steal life from subsequent attacks.', tint: 0xbc8dff, cost: 25, cooldown: 4, duration: 6 },
  { id: 'thunder', name: 'Skybreaker', description: 'Lightning staggers nearby foes. Break the Ward: ordinary sentinel shields fall for three seconds; boss conduit shields remain protected.', tint: 0x82e8ff, cost: 35, cooldown: 4, radius: 680 },
  { id: 'veil', name: 'Shadow Veil', description: 'Hide from enemy targeting for six seconds; attacking reveals you.', tint: 0xa78eff, cost: 25, cooldown: 7, duration: 6 },
  { id: 'stasis', name: 'Stillgrave', description: 'Slow nearby foes and hostile projectiles for five seconds.', tint: 0x8cddd1, cost: 40, cooldown: 7, duration: 5, radius: 800 },
  { id: 'eclipse', name: 'Eclipse Nova', description: 'Consume one earned nova charge: devastate threats and restore the courier.', tint: 0xf0d8ff, cost: 0, cooldown: 1.5, radius: 1200, charge: 'nova' },
  { id: 'clone', name: 'Courier Echo', description: 'A summoning circle calls a ten-second rifle echo. Costs resonance.', tint: 0x82e8ff, cost: 45, cooldown: 10, duration: 10 },
  { id: 'wolf', name: 'Ash Wolf', description: 'An eight-second spirit wolf pursues and bites nearby foes.', tint: 0xeab76f, cost: 35, cooldown: 8, duration: 8 },
  { id: 'dragon', name: 'Cinder Wyrm', description: 'A seven-second flying companion breathes aimed fire.', tint: 0xff825f, cost: 65, cooldown: 14, duration: 7 },
];
export const RELICS = [
  { id: 'ember-heart', name: 'Ember Heart', description: 'The first furnace remembers a human heartbeat.', tint: 0xff825f },
  { id: 'tide-glass', name: 'Tide Glass', description: 'A flooded city caught inside a shard.', tint: 0x86ddd0 },
  { id: 'storm-seal', name: 'Storm Seal', description: 'The old tower once called rain, not artillery.', tint: 0x82e8ff },
  { id: 'eclipse-fragment', name: 'Eclipse Fragment', description: 'A splinter of the Matriarch’s stolen night.', tint: 0xc49bff },
  { id: 'regent-key', name: 'Regent Key', description: 'Proof that the soul engine can be unbound.', tint: 0xff6689 },
  { id: 'soul-core', name: 'Unbound Soul', description: 'The last soul belongs to no machine.', tint: 0xf0d8ff },
];
export const CATALOG = { sword: SWORDS, gun: GUNS, armor: ARMORS, spell: SPELLS, relic: RELICS };
