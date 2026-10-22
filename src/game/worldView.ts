// The only module that talks to Phaser (decision D2). Everything else uses this API,
// so the engine can change without touching the UI.
import Phaser from 'phaser';
import type { OverworldObject, Region } from '../content/types';
import type { Action, Dir, StageSpec, XY } from '../runtime/protocol';
import type { ReplayView } from './replay';
import { overworldCell, stageCell, stageRows } from './legend';

const TILE = 16;
const ART = `${import.meta.env.BASE_URL}assets/art/`;
export const ITEM_ICONS = [
  'quill',
  'feather',
  'spyglass',
  'script_fragment',
  'gem',
  'coin',
  'key',
  'star',
  'jar',
  'scroll',
  'lamp',
  'duck',
];

export type Marker = 'available' | 'in_progress' | 'completed' | 'locked';

export interface Look {
  avatar: string;
  theme: string;
}

export interface OverworldOptions extends Look {
  region: Region;
  markers: Record<string, Marker>;
  start?: XY;
  onInteract(object: OverworldObject): void;
  onStep(position: XY): void;
  /** A click or tap asked for a step that is blocked. */
  onBlocked?(dir: Dir): void;
}

interface SheetIndex {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frames: Record<string, number>;
}

const DELTA: Record<Dir, XY> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ----- shared helpers -------------------------------------------------------------

function frameOf(scene: Phaser.Scene, sheet: 'tiles' | 'chars', name: string): number {
  const index = scene.cache.json.get(`${sheet}-index`) as SheetIndex | undefined;
  const frames = index?.frames ?? {};
  const found = frames[name] ?? frames[`${name}:0`];
  return found ?? 0;
}

function heroFrame(scene: Phaser.Scene, look: Look, dir: Dir, step: number | 'bonk'): number {
  return frameOf(
    scene,
    'chars',
    `${look.avatar}:${look.theme}:${dir}:${step === 'bonk' ? 'bonk' : step % 2}`,
  );
}

function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => scene.time.delayedCall(ms, () => resolve()));
}

function tween(
  scene: Phaser.Scene,
  config: Phaser.Types.Tweens.TweenBuilderConfig,
  ms: number,
): Promise<void> {
  if (ms <= 0) {
    const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
    for (const t of targets) {
      for (const [k, v] of Object.entries(config)) {
        if (['targets', 'duration', 'ease', 'yoyo', 'onComplete'].includes(k)) continue;
        if (typeof v === 'number' && !config.yoyo) (t as Record<string, number>)[k] = v;
      }
    }
    return Promise.resolve();
  }
  return new Promise((resolve) => scene.tweens.add({ ...config, duration: ms, onComplete: () => resolve() }));
}

function label(scene: Phaser.Scene, x: number, y: number, text: string, zoom: number, size = 1) {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
      fontSize: '28px',
      color: '#2b1d2e',
      backgroundColor: '#fff7e6',
      padding: { x: 10, y: 4 },
      align: 'center',
      wordWrap: { width: 520 },
    })
    .setOrigin(0.5, 1)
    .setDepth(50);
  // Labels are drawn large and scaled down, which needs smooth filtering.
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  t.setScale(size / Math.max(zoom, 1) / 1.6);
  return t;
}

// ----- boot -----------------------------------------------------------------------

class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  preload() {
    this.load.json('tiles-index', `${ART}tiles.json`);
    this.load.json('chars-index', `${ART}characters.json`);
    this.load.spritesheet('tiles', `${ART}tiles.png`, { frameWidth: TILE, frameHeight: TILE });
    this.load.spritesheet('chars', `${ART}characters.png`, { frameWidth: TILE, frameHeight: TILE });
    for (const item of ITEM_ICONS) this.load.image(`item:${item}`, `${ART}icons/${item}.png`);
  }
  create() {
    this.game.events.emit('codeweald-booted');
  }
}

// ----- overworld ------------------------------------------------------------------

class OverworldScene extends Phaser.Scene {
  private opts!: OverworldOptions;
  private hero!: Phaser.GameObjects.Sprite;
  private pos: XY = [0, 0];
  private facing: Dir = 'down';
  private moving = false;
  /** A key pressed (or held) while the hero was still walking: taken when the step ends. */
  private queued: Dir | null = null;
  private step = 0;
  private solid: boolean[][] = [];
  private objectsAt = new Map<string, OverworldObject>();
  private markerTexts = new Map<string, Phaser.GameObjects.Text>();
  private npcSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private cols = 0;
  private rows = 0;
  private laidOutFor = '';
  reducedMotion = false;

  constructor() {
    super('overworld');
  }

  init(opts: OverworldOptions) {
    this.opts = opts;
    this.objectsAt.clear();
    this.markerTexts.clear();
    this.npcSprites.clear();
    this.moving = false;
    this.queued = null;
    this.laidOutFor = '';
  }

  create() {
    const { region } = this.opts;
    const rows = region.overworld.grid.split('\n');
    this.rows = rows.length;
    this.cols = Math.max(...rows.map((r) => r.length));
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: this.cols, height: this.rows });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    const ground = map.createBlankLayer('ground', tileset)!;
    const over = map.createBlankLayer('over', tileset)!;
    this.solid = [];
    const waterTiles: XY[] = [];
    rows.forEach((row, y) => {
      const solidRow: boolean[] = [];
      for (let x = 0; x < this.cols; x++) {
        const cell = overworldCell(region.overworld.legend, row[x] ?? '.');
        ground.putTileAt(frameOf(this, 'tiles', cell.tile), x, y);
        if (cell.over) over.putTileAt(frameOf(this, 'tiles', cell.over), x, y);
        if (cell.tile === 'water') waterTiles.push([x, y]);
        solidRow.push(Boolean(cell.solid));
      }
      this.solid.push(solidRow);
    });
    this.animateWater(ground, waterTiles);

    let start: XY = this.opts.start ?? [1, 1];
    for (const obj of region.overworld.objects) {
      const [x, y] = obj.at;
      if (obj.kind === 'spawn' && !this.opts.start) start = obj.at;
      if (obj.kind === 'spawn' || obj.kind === 'poi') {
        this.objectsAt.set(`${x},${y}`, obj);
        continue;
      }
      this.objectsAt.set(`${x},${y}`, obj);
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (obj.kind === 'npc' && obj.id) {
        const npc = region.npcs[obj.id];
        const sprite = this.add
          .sprite(cx, cy, 'chars', frameOf(this, 'chars', npc?.sprite ?? 'npc_villager_a'))
          .setDepth(10);
        this.npcSprites.set(obj.id, sprite);
        if (!this.reducedMotion) {
          const f0 = frameOf(this, 'chars', `${npc?.sprite}:0`);
          const f1 = frameOf(this, 'chars', `${npc?.sprite}:1`);
          this.time.addEvent({
            delay: 650 + Math.random() * 200,
            loop: true,
            callback: () => sprite.setFrame(sprite.frame.name === String(f0) ? f1 : f0),
          });
        }
      } else if (obj.kind === 'board') {
        this.add.sprite(cx, cy, 'tiles', frameOf(this, 'tiles', 'quest_board')).setDepth(5);
      } else if (obj.kind === 'sign') {
        this.add.sprite(cx, cy, 'tiles', frameOf(this, 'tiles', 'sign')).setDepth(5);
      }
    }

    this.pos = start;
    this.hero = this.add
      .sprite(
        start[0] * TILE + TILE / 2,
        start[1] * TILE + TILE / 2,
        'chars',
        heroFrame(this, this.opts, 'down', 0),
      )
      .setDepth(20);
    this.updateMarkers(this.opts.markers);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.input.on('pointerdown', this.onPointer, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.input.off('pointerdown', this.onPointer, this);
    });
  }

  /** Click or tap to walk (F-WLD-05): one step toward the tile, or talk to a neighbour. */
  private onPointer(pointer: Phaser.Input.Pointer) {
    const at = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const [tx, ty] = [Math.floor(at.x / TILE), Math.floor(at.y / TILE)];
    const [dx, dy] = [tx - this.pos[0], ty - this.pos[1]];
    if (dx === 0 && dy === 0) return;
    const dir: Dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    const next = Math.abs(dx) + Math.abs(dy) === 1 ? this.objectsAt.get(`${tx},${ty}`) : undefined;
    if (next && next.kind !== 'spawn' && next.kind !== 'poi' && !this.moving) {
      this.facing = dir;
      this.hero.setFrame(heroFrame(this, this.opts, dir, 0));
      this.opts.onInteract(next);
      return;
    }
    if (!this.tryMove(dir)) this.opts.onBlocked?.(dir);
  }

  private animateWater(layer: Phaser.Tilemaps.TilemapLayer, tiles: XY[]) {
    if (!tiles.length || this.reducedMotion) return;
    const a = frameOf(this, 'tiles', 'water');
    const b = frameOf(this, 'tiles', 'water:1');
    if (a === b) return;
    let flip = false;
    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        flip = !flip;
        for (const [x, y] of tiles) layer.putTileAt(flip ? b : a, x, y);
      },
    });
  }

  layout() {
    const w = this.scale.width;
    const h = this.scale.height;
    // Phaser also sends 'resize' when only the canvas moved on the page. Re-running the
    // layout then would snap the camera, so only a real size change counts.
    if (this.laidOutFor === `${w}x${h}`) return;
    this.laidOutFor = `${w}x${h}`;
    const cam = this.cameras.main;
    const worldW = this.cols * TILE;
    const worldH = this.rows * TILE;
    const fit = Math.min(w / worldW, h / worldH);
    // Whole-number zoom keeps every pixel the same size (F-WLD-01).
    const zoom = Math.max(2, Math.min(4, Math.floor(fit)));
    cam.setZoom(zoom);
    // A map smaller than the view sits in the middle: widen the bounds around it.
    const padX = Math.max(0, (w / zoom - worldW) / 2);
    const padY = Math.max(0, (h / zoom - worldH) / 2);
    cam.setBounds(-padX, -padY, worldW + padX * 2, worldH + padY * 2);
    cam.startFollow(this.hero, true, 0.2, 0.2);
  }

  updateMarkers(markers: Record<string, Marker>) {
    this.opts.markers = markers;
    for (const t of this.markerTexts.values()) t.destroy();
    this.markerTexts.clear();
    for (const obj of this.opts.region.overworld.objects) {
      if (!obj.quest) continue;
      const state = markers[obj.quest] ?? 'locked';
      if (state === 'locked') continue;
      const symbol = state === 'completed' ? '✓' : state === 'in_progress' ? '…' : '!';
      const t = label(
        this,
        obj.at[0] * TILE + TILE / 2,
        obj.at[1] * TILE + 1,
        symbol,
        this.cameras.main.zoom || 2,
        0.6,
      );
      t.setStyle({ backgroundColor: state === 'completed' ? '#d9f2e3' : '#ffe08a' });
      this.markerTexts.set(obj.quest, t);
    }
  }

  isBlocked(x: number, y: number) {
    if (x < 0 || y < 0 || y >= this.rows || x >= this.cols) return true;
    if (this.solid[y]?.[x]) return true;
    const obj = this.objectsAt.get(`${x},${y}`);
    return Boolean(obj && obj.kind !== 'poi' && obj.kind !== 'spawn');
  }

  /** False only when the way is blocked. Holding a key queues the next step. */
  tryMove(dir: Dir): boolean {
    if (this.moving) {
      this.queued = dir;
      return true;
    }
    this.facing = dir;
    const [dx, dy] = DELTA[dir];
    const [nx, ny] = [this.pos[0] + dx, this.pos[1] + dy];
    this.hero.setFrame(heroFrame(this, this.opts, dir, this.step));
    if (this.isBlocked(nx, ny)) return false;
    this.moving = true;
    this.step++;
    this.pos = [nx, ny];
    const ms = this.reducedMotion ? 0 : 140;
    void tween(this, { targets: this.hero, x: nx * TILE + TILE / 2, y: ny * TILE + TILE / 2 }, ms).then(
      () => {
        this.hero.setFrame(heroFrame(this, this.opts, dir, 0));
        this.moving = false;
        this.opts.onStep(this.pos);
        const next = this.queued;
        this.queued = null;
        if (next) this.tryMove(next);
      },
    );
    return true;
  }

  interact() {
    const [dx, dy] = DELTA[this.facing];
    const ahead = this.objectsAt.get(`${this.pos[0] + dx},${this.pos[1] + dy}`);
    if (ahead && ahead.kind !== 'spawn' && ahead.kind !== 'poi') this.opts.onInteract(ahead);
    return ahead ?? null;
  }

  get position(): XY {
    return this.pos;
  }

  get facingDir(): Dir {
    return this.facing;
  }
}

// ----- quest stage ------------------------------------------------------------------

interface StageData extends Look {
  stage: StageSpec;
}

class StageScene extends Phaser.Scene {
  private data_!: StageData;
  private hero: Phaser.GameObjects.Sprite | null = null;
  private heroPos: XY = [0, 0];
  private facing: Dir = 'right';
  private items = new Map<string, Phaser.GameObjects.Image[]>();
  private chests = new Map<string, Phaser.GameObjects.Sprite>();
  private bubble: Phaser.GameObjects.Text | null = null;
  private cols = 1;
  private rows = 1;
  private stepCount = 0;
  reducedMotion = false;

  constructor() {
    super('stage');
  }

  init(data: StageData) {
    this.data_ = data;
  }

  create() {
    this.build();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
  }

  /** (Re)draw the stage in its starting state. */
  build() {
    this.children.removeAll(true);
    this.tweens.killAll();
    this.items.clear();
    this.chests.clear();
    this.bubble = null;
    this.hero = null;
    const { stage } = this.data_;
    if (stage.kind === 'grid') this.buildGrid(stage);
    else if (stage.kind === 'npc') this.buildCast(stage);
    this.layout();
  }

  private buildGrid(stage: StageSpec) {
    const rows = stageRows(stage);
    this.rows = rows.length;
    this.cols = Math.max(...rows.map((r) => r.length));
    this.facing = stage.facing ?? 'right';
    rows.forEach((row, y) => {
      for (let x = 0; x < this.cols; x++) {
        const ch = row[x] ?? ' ';
        const cell = stageCell(stage, ch);
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        this.add.image(cx, cy, 'tiles', frameOf(this, 'tiles', cell.tile ?? 'floor'));
        if (cell.item) {
          const icon = this.add.image(cx, cy, `item:${cell.item}`).setDepth(5);
          this.items.set(`${x},${y}`, [icon]);
        }
        if (cell.object === 'chest') {
          this.chests.set(
            `${x},${y}`,
            this.add.sprite(cx, cy, 'tiles', frameOf(this, 'tiles', 'chest_closed')).setDepth(6),
          );
        } else if (cell.object === 'npc') {
          const sprite = stage.npcs?.[ch]?.sprite ?? 'npc_villager_a';
          this.add.sprite(cx, cy, 'chars', frameOf(this, 'chars', sprite)).setDepth(8);
        } else if (cell.object) {
          const tiles = this.cache.json.get('tiles-index') as SheetIndex | undefined;
          const sheet = tiles?.frames[cell.object] !== undefined ? 'tiles' : 'chars';
          this.add.sprite(cx, cy, sheet, frameOf(this, sheet, cell.object)).setDepth(6);
        }
        if (cell.hero) this.heroPos = [x, y];
      }
    });
    this.hero = this.add
      .sprite(
        this.heroPos[0] * TILE + TILE / 2,
        this.heroPos[1] * TILE + TILE / 2,
        'chars',
        heroFrame(this, this.data_, this.facing, 0),
      )
      .setDepth(20);
  }

  private buildCast(stage: StageSpec) {
    const cast = stage.cast ?? [];
    this.cols = Math.max(5, cast.length * 2 + 3);
    this.rows = 3;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.add.image(
          x * TILE + TILE / 2,
          y * TILE + TILE / 2,
          'tiles',
          frameOf(this, 'tiles', y === 2 ? 'grass' : 'cobble'),
        );
      }
    }
    this.heroPos = [1, 1];
    this.facing = 'right';
    this.hero = this.add
      .sprite(TILE * 1.5, TILE * 1.5, 'chars', heroFrame(this, this.data_, 'right', 0))
      .setDepth(20);
    cast.forEach((member, i) => {
      this.add
        .sprite((3 + i * 2) * TILE + TILE / 2, TILE * 1.5, 'chars', frameOf(this, 'chars', member.sprite))
        .setDepth(10);
    });
  }

  layout() {
    const cam = this.cameras.main;
    const worldW = this.cols * TILE;
    const worldH = this.rows * TILE;
    const zoom = Math.max(
      1,
      Math.min(6, Math.floor(Math.min(this.scale.width / worldW, (this.scale.height - 24) / worldH))),
    );
    cam.setZoom(zoom);
    cam.centerOn(worldW / 2, worldH / 2 - 6 / zoom);
  }

  private at(xy: XY) {
    return { x: xy[0] * TILE + TILE / 2, y: xy[1] * TILE + TILE / 2 };
  }

  private say(text: string) {
    this.bubble?.destroy();
    if (!this.hero) return;
    this.bubble = label(this, this.hero.x, this.hero.y - TILE / 2 - 2, text, this.cameras.main.zoom);
  }

  private flash(xy: XY, text: string, ms: number) {
    const p = this.at(xy);
    const t = label(this, p.x, p.y - 4, text, this.cameras.main.zoom);
    void wait(this, Math.max(ms, 400)).then(() => t.destroy());
  }

  async apply(action: Action, ms: number): Promise<void> {
    const hero = this.hero;
    const moveMs = this.reducedMotion ? 0 : ms;
    switch (action.t) {
      case 'move': {
        if (!hero) return;
        this.facing = action.dir;
        this.stepCount++;
        hero.setFrame(heroFrame(this, this.data_, action.dir, this.stepCount));
        await tween(this, { targets: hero, ...this.at(action.to) }, moveMs);
        if (moveMs === 0) Object.assign(hero, this.at(action.to));
        hero.setFrame(heroFrame(this, this.data_, action.dir, 0));
        this.heroPos = action.to;
        if (this.bubble) this.bubble.setPosition(hero.x, hero.y - TILE / 2 - 2);
        return;
      }
      case 'bonk': {
        if (!hero) return;
        this.facing = action.dir;
        // Stars over the head: a still picture, plus the word, even with reduced motion.
        hero.setFrame(heroFrame(this, this.data_, action.dir, 'bonk'));
        this.flash(action.at, 'bonk!', ms);
        if (!this.reducedMotion && ms > 0) {
          const [dx, dy] = DELTA[action.dir];
          await tween(
            this,
            { targets: hero, x: hero.x + dx * 4, y: hero.y + dy * 4, yoyo: true, ease: 'Quad.easeOut' },
            ms / 2,
          );
        } else await wait(this, ms);
        if (ms > 0) hero.setFrame(heroFrame(this, this.data_, action.dir, 0));
        return;
      }
      case 'face':
        this.facing = action.dir;
        hero?.setFrame(heroFrame(this, this.data_, action.dir, 0));
        await wait(this, ms);
        return;
      case 'say':
        this.say(action.text);
        await wait(this, ms);
        return;
      case 'pickup': {
        if (!action.item) {
          this.flash(action.at, '?', ms);
          await wait(this, ms);
          return;
        }
        const key = `${action.at[0]},${action.at[1]}`;
        const icon = this.items.get(key)?.shift();
        if (icon) {
          if (moveMs > 0) await tween(this, { targets: icon, y: icon.y - 8, alpha: 0 }, moveMs);
          icon.destroy();
        }
        return;
      }
      case 'chest': {
        const chest = this.chests.get(`${action.at[0]},${action.at[1]}`);
        if (action.ok && chest) {
          chest.setFrame(frameOf(this, 'tiles', 'chest_open'));
          if (action.loot.length) this.flash(action.at, `+ ${action.loot.join(', ')}`, ms);
          await wait(this, ms);
        } else {
          this.flash(action.at, action.missing ? 'no chest' : 'rattle!', ms);
          if (chest && moveMs > 0)
            await tween(this, { targets: chest, x: chest.x + 2, yoyo: true, repeat: 2 }, moveMs / 6);
          else await wait(this, ms);
        }
        return;
      }
      case 'look':
        this.flash(action.at, 'look', ms);
        await wait(this, ms);
        return;
      case 'wait':
        await wait(this, ms);
        return;
      default:
        return;
    }
  }

  /** The Bug turns into a friendly, glowing firefly (F-BOS-03). Static with reduced motion. */
  /** The hero cheers when a quest passes (F-ONB-03): arms up, with a small hop unless motion
   *  is reduced. */
  cheer() {
    const hero = this.hero;
    if (!hero) return;
    hero.setFrame(frameOf(this, 'chars', `${this.data_.avatar}:${this.data_.theme}:celebrate`));
    if (this.reducedMotion) return;
    this.tweens.add({
      targets: hero,
      y: hero.y - 3,
      duration: 160,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });
  }

  celebrate(bugSprite: string) {
    const bugFrame = String(frameOf(this, 'chars', bugSprite));
    const bug = this.children.list.find(
      (c): c is Phaser.GameObjects.Sprite =>
        c instanceof Phaser.GameObjects.Sprite && c.texture.key === 'chars' && c.frame.name === bugFrame,
    );
    const x = bug?.x ?? (this.hero ? this.hero.x + TILE : (this.cols * TILE) / 2);
    const y = bug?.y ?? (this.hero ? this.hero.y - TILE : (this.rows * TILE) / 2);
    bug?.destroy();
    const f0 = frameOf(this, 'chars', 'firefly:0');
    const f1 = frameOf(this, 'chars', 'firefly:1');
    const glow = this.add.circle(x, y, 9, 0xfff3a0, 0.45).setDepth(29);
    const fly = this.add.sprite(x, y, 'chars', f0).setDepth(30);
    if (this.reducedMotion) return;
    this.tweens.add({ targets: glow, alpha: 0.15, scale: 1.4, duration: 700, yoyo: true, repeat: -1 });
    this.tweens.add({
      targets: [fly, glow],
      y: y - 4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => fly.setFrame(fly.frame.name === String(f0) ? f1 : f0),
    });
  }

  describe(): string {
    if (!this.hero) return 'There is no map in this quest.';
    const stage = this.data_.stage;
    const rows = stageRows(stage);
    const [x, y] = this.heroPos;
    const around = (Object.keys(DELTA) as Dir[]).map((dir) => {
      const [dx, dy] = DELTA[dir];
      const ch = rows[y + dy]?.[x + dx];
      const what =
        ch === undefined
          ? 'the edge'
          : (stageCell(stage, ch).object ??
            stageCell(stage, ch).item ??
            stageCell(stage, ch).tile ??
            'floor');
      return `${dir}: ${what}`;
    });
    return `The hero is at column ${x}, row ${y}, facing ${this.facing}. ${around.join('; ')}.`;
  }
}

// ----- the public API -----------------------------------------------------------------

export class WorldView implements ReplayView {
  readonly host: HTMLDivElement;
  private game: Phaser.Game;
  readonly ready: Promise<void>;
  private reducedMotion = false;
  private stageData: StageData | null = null;

  constructor() {
    this.host = document.createElement('div');
    this.host.className = 'world-host';
    this.host.style.width = '100%';
    this.host.style.height = '100%';
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.host,
      backgroundColor: '#20192b',
      banner: false,
      // The canvas is sized by fit() below, not by Phaser's RESIZE mode. RESIZE polls the
      // page every 500 ms and counts fractional sizes and positions as changes, which made
      // the map jump.
      scale: { mode: Phaser.Scale.NONE, width: 640, height: 400 },
      // Crisp pixels at whole-number zoom levels (F-WLD-01). Text labels opt back into smoothing.
      render: { pixelArt: true, powerPreference: 'low-power' },
      input: { keyboard: false, gamepad: false },
      audio: { noAudio: true },
      scene: [BootScene, OverworldScene, StageScene],
    });
    this.ready = new Promise((resolve) => this.game.events.once('codeweald-booted', () => resolve()));
    void this.ready.then(() => this.fit());
    new ResizeObserver(() => this.fit()).observe(this.host);
    // Tests and debugging (only with ?dev in the URL) can inspect the Phaser game.
    if (new URLSearchParams(location.search).has('dev')) {
      (window as unknown as { __codewealdGame?: Phaser.Game }).__codewealdGame = this.game;
    }
  }

  /** Move the canvas into a screen's placeholder element. */
  mount(parent: HTMLElement) {
    if (this.host.parentElement !== parent) parent.appendChild(this.host);
    this.fit();
  }

  /** Make the canvas exactly as big as its holder, in whole pixels. */
  private fit() {
    if (!this.game.isBooted) return;
    const box = this.host.getBoundingClientRect();
    const w = Math.floor(box.width);
    const h = Math.floor(box.height);
    if (w < 1 || h < 1) return;
    if (w !== this.game.scale.width || h !== this.game.scale.height) this.game.scale.resize(w, h);
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on;
  }

  private get overworld() {
    return this.game.scene.getScene('overworld') as OverworldScene;
  }

  private get stage() {
    return this.game.scene.getScene('stage') as StageScene;
  }

  async showOverworld(options: OverworldOptions) {
    await this.ready;
    this.game.scene.stop('stage');
    const scene = this.overworld;
    scene.reducedMotion = this.reducedMotion;
    this.game.scene.start('overworld', options);
  }

  updateMarkers(markers: Record<string, Marker>) {
    if (this.game.scene.isActive('overworld')) this.overworld.updateMarkers(markers);
  }

  moveHero(dir: Dir): boolean {
    return this.game.scene.isActive('overworld') ? this.overworld.tryMove(dir) : false;
  }

  interact(): OverworldObject | null {
    return this.game.scene.isActive('overworld') ? this.overworld.interact() : null;
  }

  get heroPosition(): XY | null {
    return this.game.scene.isActive('overworld') ? this.overworld.position : null;
  }

  async showStage(stage: StageSpec, look: Look) {
    await this.ready;
    this.game.scene.stop('overworld');
    this.stageData = { stage, ...look };
    this.stage.reducedMotion = this.reducedMotion;
    this.game.scene.start('stage', this.stageData);
  }

  reset() {
    if (this.game.scene.isActive('stage')) this.stage.build();
  }

  apply(action: Action, ms: number): Promise<void> {
    if (!this.game.scene.isActive('stage')) return Promise.resolve();
    return this.stage.apply(action, ms);
  }

  cheer() {
    if (this.game.scene.isActive('stage')) this.stage.cheer();
  }

  celebrateBoss(bugSprite: string) {
    if (this.game.scene.isActive('stage')) this.stage.celebrate(bugSprite);
  }

  describeStage(): string {
    return this.game.scene.isActive('stage') ? this.stage.describe() : '';
  }
}

let shared: WorldView | null = null;

export function getWorldView(): WorldView {
  shared ??= new WorldView();
  return shared;
}
