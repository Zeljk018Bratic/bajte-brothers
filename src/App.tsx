
import React, { useEffect, useRef, useState } from 'react';

// --- SINTISAJZER ZVUKA (Web Audio API) ---
class SoundEffects {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLaser() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playExplosion() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playCoin() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.setValueAtTime(900, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playVictory() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx!.currentTime + idx * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(this.ctx!.currentTime + idx * 0.1);
      osc.stop(this.ctx!.currentTime + idx * 0.1 + 0.25);
    });
  }
}

const sfx = new SoundEffects();

// --- TIPOVI PODATAKA ---
interface Bullet { x: number; y: number; vx: number; vy: number; radius: number; isEnemy: boolean; }
interface Enemy { x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; speed: number; radius: number; }
interface Boss { x: number; y: number; hp: number; maxHp: number; radius: number; shootTimer: number; }
interface Powerup { x: number; y: number; type: 'star' | 'diamond' | 'magnet' | 'chrono' | 'camo' | 'shield'; radius: number; }
interface Particle { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; }

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lang, setLang] = useState<'HR' | 'EN' | 'DE' | 'IT'>('HR');
  const [playerName, setPlayerName] = useState('Alex');
  const [selectedHero, setSelectedHero] = useState('Alex');
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [stars, setStars] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);
  const [gameOverModal, setGameOverModal] = useState(false);
  const [rescuedAnimal, setRescuedAnimal] = useState('🦊');

  const [shopUpgrades, setShopUpgrades] = useState({
    fuelMax: 100,
    armor: 1,
    speed: 5.5,
    weapon: 1
  });

  const translations = {
    HR: { title: "BAJTE BROTHERS 3.0", heroName: "Ime Heroja:", selectHero: "Odaberi Heroja:", start: "KRENI U MISIJU! 🚀", shop: "BAJTE SHOP 🛒", next: "SLJEDEĆI NIVO ➔", retry: "POKUŠAJ PONOVNO 🔄", vicTitle: "ŽIVOTINJA SPAŠENA! 🎉", vicMsg: "Bravo {name}! Spasio si životinju!", goTitle: "MISIJA NIJE USPJELA!", goMsg: "Ostali ste bez HP-a ili goriva!" },
    EN: { title: "BAJTE BROTHERS 3.0", heroName: "Hero Name:", selectHero: "Select Hero:", start: "START MISSION! 🚀", shop: "BAJTE SHOP 🛒", next: "NEXT LEVEL ➔", retry: "TRY AGAIN 🔄", vicTitle: "ANIMAL RESCUED! 🎉", vicMsg: "Great job {name}! Animal saved!", goTitle: "MISSION FAILED!", goMsg: "Out of fuel or HP!" },
    DE: { title: "BAJTE BROTHERS 3.0", heroName: "Heldenname:", selectHero: "Held wählen:", start: "MISSION STARTEN! 🚀", shop: "BAJTE SHOP 🛒", next: "NÄCHSTES LEVEL ➔", retry: "NOCHMAL 🔄", vicTitle: "TIER GERETTET! 🎉", vicMsg: "Super {name}! Tier gerettet!", goTitle: "MISSION FEHLGESCHLAGEN!", goMsg: "Kein Treibstoff mehr!" },
    IT: { title: "BAJTE BROTHERS 3.0", heroName: "Nome Eroe:", selectHero: "Scegli Eroe:", start: "INIZIA MISSIONE! 🚀", shop: "BAJTE SHOP 🛒", next: "PROSSIMO LIVELLO ➔", retry: "RIPROVA 🔄", vicTitle: "ANIMALE SALVATO! 🎉", vicMsg: "Grande {name}! Animale salvato!", goTitle: "MISSIONE FALLITA!", goMsg: "Senza carburante!" }
  };

  const t = translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem('bajte_save_3_0');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.playerName) setPlayerName(data.playerName);
        if (data.level) setLevel(data.level);
        if (data.stars) setStars(data.stars);
        if (data.shopUpgrades) setShopUpgrades(data.shopUpgrades);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveGame = (newLvl = level, newStars = stars, newUpgrades = shopUpgrades) => {
    localStorage.setItem('bajte_save_3_0', JSON.stringify({
      playerName,
      selectedHero,
      level: newLvl,
      stars: newStars,
      shopUpgrades: newUpgrades
    }));
  };

  const buyUpgrade = (type: string, cost: number) => {
    if (stars < cost) return;
    const newStars = stars - cost;
    const updated = { ...shopUpgrades };
    if (type === 'fuel') updated.fuelMax += 30;
    if (type === 'armor') updated.armor += 0.5;
    if (type === 'speed') updated.speed += 0.8;
    if (type === 'weapon' && updated.weapon < 3) updated.weapon += 1;
    setStars(newStars);
    setShopUpgrades(updated);
    saveGame(level, newStars, updated);
    sfx.playCoin();
  };

  useEffect(() => {
    if (!gameStarted || !canvasRef.current) return;

    sfx.init();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const GAME_W = 1280;
    const GAME_H = 720;

    let animId: number;
    let shake = 0;

    // Stanje igrača
    let playerX = 150, playerY = GAME_H / 2;
    let angle = 0;
    let speed = 0;
    let hp = 100 * shopUpgrades.armor;
    let maxHp = 100 * shopUpgrades.armor;
    let fuel = shopUpgrades.fuelMax;
    let hasKey = false;

    // Powerup tajmeri
    let magnetTimer = 0;
    let chronoTimer = 0;
    let camoTimer = 0;

    // Kontrole
    const keys: Record<string, boolean> = {};
    let joystickVector = { x: 0, y: 0 };
    let isFiring = false;
    let lastShootTime = 0;

    const animals = ['🦊', '🐰', '🐻', '🐼', '🐨'];
    const curAnimal = animals[(level - 1) % animals.length];
    setRescuedAnimal(curAnimal);

    // Mrežni objekti
    let bullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    let boss: Boss | null = (level % 3 === 0) ? { x: GAME_W - 250, y: GAME_H / 2, hp: 300 + level * 50, maxHp: 300 + level * 50, radius: 55, shootTimer: 0 } : null;
    let powerups: Powerup[] = [];
    let particles: Particle[] = [];

    // Generiranje objekata
    const keyPos = { x: GAME_W / 2 + (Math.random() * 200 - 100), y: 150 + Math.random() * 400 };
    const cagePos = { x: GAME_W - 120, y: GAME_H / 2 };

    // Neprijatelji
    const enemyCount = 3 + level * 2;
    for (let i = 0; i < enemyCount; i++) {
      enemies.push({
        x: 400 + Math.random() * 600,
        y: 100 + Math.random() * 500,
        vx: 0, vy: 0,
        hp: 20 + level * 5,
        maxHp: 20 + level * 5,
        speed: 1.5 + Math.random() * 1.5 + level * 0.2,
        radius: 20
      });
    }

    // Power-upovi
    const types: Powerup['type'][] = ['star', 'star', 'diamond', 'magnet', 'chrono', 'camo'];
    for (let i = 0; i < 8; i++) {
      powerups.push({
        x: 200 + Math.random() * 800,
        y: 100 + Math.random() * 500,
        type: types[Math.floor(Math.random() * types.length)],
        radius: 15
      });
    }

    // Tipke
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') fireWeapon();
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Touch kontroler za mobitele
    let touchId: number | null = null;
    let touchStartPos = { x: 0, y: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      sfx.init();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < window.innerWidth / 2 && touchId === null) {
          touchId = t.identifier;
          touchStartPos = { x: t.clientX, y: t.clientY };
        } else if (t.clientX >= window.innerWidth / 2) {
          isFiring = true;
          fireWeapon();
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId) {
          const dx = t.clientX - touchStartPos.x;
          const dy = t.clientY - touchStartPos.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = 50;
          joystickVector = {
            x: Math.min(1, Math.max(-1, dx / maxDist)),
            y: Math.min(1, Math.max(-1, dy / maxDist))
          };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchId) {
          touchId = null;
          joystickVector = { x: 0, y: 0 };
        } else if (t.clientX >= window.innerWidth / 2) {
          isFiring = false;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    // Pucanje
    function fireWeapon() {
      const now = Date.now();
      if (now - lastShootTime < 200) return;
      lastShootTime = now;

      sfx.playLaser();
      const bulletSpeed = 12;

      if (shopUpgrades.weapon === 1) {
        bullets.push({ x: playerX, y: playerY, vx: Math.cos(angle) * bulletSpeed, vy: Math.sin(angle) * bulletSpeed, radius: 5, isEnemy: false });
      } else if (shopUpgrades.weapon === 2) {
        [-0.2, 0, 0.2].forEach(aOffset => {
          bullets.push({ x: playerX, y: playerY, vx: Math.cos(angle + aOffset) * bulletSpeed, vy: Math.sin(angle + aOffset) * bulletSpeed, radius: 5, isEnemy: false });
        });
      } else if (shopUpgrades.weapon === 3) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          bullets.push({ x: playerX, y: playerY, vx: Math.cos(a) * bulletSpeed, vy: Math.sin(a) * bulletSpeed, radius: 6, isEnemy: false });
        }
      }
    }

    const spawnParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const pSpeed = Math.random() * 4 + 1;
        particles.push({
          x, y,
          vx: Math.cos(pAngle) * pSpeed,
          vy: Math.sin(pAngle) * pSpeed,
          color,
          life: 1,
          maxLife: 20 + Math.random() * 10
        });
      }
    };

    // Skaliranje ekrana
    const resize = () => {
      const scale = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
      canvas.width = GAME_W * scale;
      canvas.height = GAME_H * scale;
      ctx.resetTransform();
      ctx.scale(scale, scale);
    };
    resize();
    window.addEventListener('resize', resize);

    // --- GAME LOOP ---
    const loop = () => {
      ctx.clearRect(0, 0, GAME_W, GAME_H);

      // Potresanje ekrana
      ctx.save();
      if (shake > 0) {
        const sx = (Math.random() - 0.5) * shake;
        const sy = (Math.random() - 0.5) * shake;
        ctx.translate(sx, sy);
        shake *= 0.9;
        if (shake < 0.5) shake = 0;
      }

      // Neon Pozadina / Tema Nivoa
      const themes = ['#00f3ff', '#ff007f', '#00ff66', '#ffaa00', '#9900ff'];
      const themeColor = themes[(level - 1) % themes.length];

      ctx.strokeStyle = themeColor + '22';
      ctx.lineWidth = 1;
      for (let x = 0; x < GAME_W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_H); ctx.stroke();
      }
      for (let y = 0; y < GAME_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke();
      }

      // Kretanje igrača (Tipkovnica + Joystick)
      let dx = joystickVector.x;
      let dy = joystickVector.y;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;

      if ((dx !== 0 || dy !== 0) && fuel > 0) {
        angle = Math.atan2(dy, dx);
        speed = Math.min(speed + 0.4, shopUpgrades.speed);
        fuel = Math.max(0, fuel - 0.04);
      } else {
        speed *= 0.92;
      }

      playerX += Math.cos(angle) * speed;
      playerY += Math.sin(angle) * speed;

      playerX = Math.max(30, Math.min(GAME_W - 30, playerX));
      playerY = Math.max(30, Math.min(GAME_H - 30, playerY));

      // Pucanje držeći tipku
      if (keys[' '] || isFiring) fireWeapon();

      // Cyber-Magnet privlačenje
      if (magnetTimer > 0) magnetTimer--;
      if (chronoTimer > 0) chronoTimer--;
      if (camoTimer > 0) camoTimer--;

      // Power-upovi renderiranje i kolizije
      powerups.forEach((p, idx) => {
        if (magnetTimer > 0) {
          const pAngle = Math.atan2(playerY - p.y, playerX - p.x);
          p.x += Math.cos(pAngle) * 6;
          p.y += Math.sin(pAngle) * 6;
        }

        ctx.font = '24px sans-serif';
        const icon = p.type === 'star' ? '⭐' : p.type === 'diamond' ? '💎' : p.type === 'magnet' ? '🧲' : p.type === 'chrono' ? '⏳' : '👤';
        ctx.fillText(icon, p.x - 12, p.y + 10);

        if (Math.hypot(playerX - p.x, playerY - p.y) < 30) {
          sfx.playCoin();
          if (p.type === 'star') setStars(s => s + 1);
          if (p.type === 'diamond') setStars(s => s + 5);
          if (p.type === 'magnet') magnetTimer = 300;
          if (p.type === 'chrono') chronoTimer = 300;
          if (p.type === 'camo') camoTimer = 360;
          powerups.splice(idx, 1);
        }
      });

      // Ključ
      if (!hasKey) {
        ctx.font = '32px sans-serif';
        ctx.fillText('🔑', keyPos.x - 16, keyPos.y + 12);
        if (Math.hypot(playerX - keyPos.x, playerY - keyPos.y) < 35) {
          hasKey = true;
          sfx.playCoin();
          spawnParticles(keyPos.x, keyPos.y, '#ffff00', 15);
        }
      }

      // Kavez sa životinjom
      ctx.font = '40px sans-serif';
      ctx.fillText(curAnimal, cagePos.x - 20, cagePos.y + 15);
      ctx.strokeStyle = hasKey ? '#00ff66' : '#ff0055';
      ctx.lineWidth = 4;
      ctx.strokeRect(cagePos.x - 30, cagePos.y - 30, 60, 60);

      // Pobjeda u nivou
      if (hasKey && (!boss || boss.hp <= 0) && Math.hypot(playerX - cagePos.x, playerY - cagePos.y) < 50) {
        sfx.playVictory();
        setVictoryModal(true);
        setGameStarted(false);
        saveGame(level + 1, stars + 10, shopUpgrades);
        ctx.restore();
        return;
      }

      // Projektili kretanje i udarci
      bullets.forEach((b, bIdx) => {
        b.x += b.vx;
        b.y += b.vy;

        ctx.fillStyle = b.isEnemy ? '#ff0055' : '#00f3ff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pucanj u neprijatelje
        if (!b.isEnemy) {
          enemies.forEach((e, eIdx) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
              e.hp -= 15;
              bullets.splice(bIdx, 1);
              spawnParticles(e.x, e.y, '#ff0055', 6);
              if (e.hp <= 0) {
                sfx.playExplosion();
                enemies.splice(eIdx, 1);
                shake = 10;
              }
            }
          });

          if (boss && Math.hypot(b.x - boss.x, b.y - boss.y) < boss.radius + b.radius) {
            boss.hp -= 10;
            bullets.splice(bIdx, 1);
            spawnParticles(boss.x, boss.y, '#ff0055', 8);
            if (boss.hp <= 0) {
              sfx.playExplosion();
              shake = 25;
            }
          }
        } else {
          // Neprijateljski metak pogodio igrača
          if (camoTimer <= 0 && Math.hypot(b.x - playerX, b.y - playerY) < 20) {
            hp -= 10;
            bullets.splice(bIdx, 1);
            shake = 12;
            sfx.playExplosion();
          }
        }
      });

      // Obični neprijatelji (Trapavko)
      const enemySpeedMult = chronoTimer > 0 ? 0.5 : 1;
      enemies.forEach((e) => {
        if (camoTimer <= 0) {
          const eAngle = Math.atan2(playerY - e.y, playerX - e.x);
          e.x += Math.cos(eAngle) * e.speed * enemySpeedMult;
          e.y += Math.sin(eAngle) * e.speed * enemySpeedMult;
        }

        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();

        // Dodir s igračem
        if (camoTimer <= 0 && Math.hypot(playerX - e.x, playerY - e.y) < e.radius + 20) {
          hp -= 0.5;
          shake = 5;
        }
      });

      // Boss Borba
      if (boss && boss.hp > 0) {
        boss.shootTimer++;
        if (boss.shootTimer > (chronoTimer > 0 ? 100 : 60)) {
          boss.shootTimer = 0;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            bullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, radius: 8, isEnemy: true });
          }
        }

        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Boss Traka sa zdravljem na vrhu ekrana
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(GAME_W / 2 - 200, 20, 400, 20);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(GAME_W / 2 - 200, 20, (boss.hp / boss.maxHp) * 400, 20);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(GAME_W / 2 - 200, 20, 400, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('MEGA TRAPAVKO BOSS', GAME_W / 2 - 60, 35);
      }

      // Čestice (Explosions)
      particles.forEach((p, pIdx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        if (p.life >= p.maxLife) particles.splice(pIdx, 1);
      });

      // Igrač (Bager)
      ctx.save();
      ctx.translate(playerX, playerY);
      ctx.rotate(angle);
      ctx.fillStyle = camoTimer > 0 ? 'rgba(0, 243, 255, 0.4)' : '#00f3ff';
      ctx.fillRect(-22, -16, 44, 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -8, 16, 16);
      ctx.restore();

      // Poraz
      if (fuel <= 0 || hp <= 0) {
        setGameOverModal(true);
        setGameStarted(false);
        ctx.restore();
        return;
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [gameStarted, level, shopUpgrades]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020208] text-white font-sans flex justify-center items-center select-none">
      <canvas ref={canvasRef} className="block shadow-[0_0_30px_rgba(0,243,255,0.3)] rounded-xl" />

      {/* HUD Traka */}
      {gameStarted && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center bg-slate-900/90 p-3 rounded-xl border border-cyan-500/40 backdrop-blur">
          <div className="flex gap-4 text-xs font-black text-cyan-400">
            <div>NIVO: {level}</div>
            <div>⭐ ZVIJEZDE: {stars}</div>
            <div>👤 {playerName}</div>
          </div>
          <button
            onClick={() => setShopOpen(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-lg font-black text-xs transition shadow-[0_0_10px_rgba(234,179,8,0.5)]"
          >
            TRGOVINA 🛒
          </button>
        </div>
      )}

      {/* Početni Izbornik */}
      {!gameStarted && !victoryModal && !gameOverModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-[0_0_40px_rgba(0,243,255,0.4)]">
            <h1 className="text-2xl font-black text-cyan-400 tracking-wider uppercase">{t.title}</h1>

            <div className="flex justify-center gap-2">
              {(['HR', 'EN', 'DE', 'IT'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs border transition ${lang === l ? 'bg-cyan-500 border-cyan-300 text-black' : 'bg-slate-800 border-slate-700 text-white'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="text-left">
              <label className="text-xs text-slate-400 uppercase font-bold">{t.heroName}</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="w-full mt-1 bg-black/70 border border-cyan-500/50 rounded-lg p-2.5 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="text-left">
              <label className="text-xs text-slate-400 uppercase font-bold">{t.selectHero}</label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {['Alex', 'Mia', 'Kevin', 'Lara', 'Nova'].map(h => (
                  <button
                    key={h}
                    onClick={() => setSelectedHero(h)}
                    className={`p-2 rounded-xl border text-center transition ${selectedHero === h ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-slate-800 bg-slate-800/50'}`}
                  >
                    <div className="text-xl">🤖</div>
                    <div className="text-[10px] font-bold mt-1">{h}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setGameStarted(true); saveGame(); }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black py-3.5 rounded-xl uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(0,243,255,0.5)] transition transform active:scale-95"
            >
              {t.start}
            </button>
          </div>
        </div>
      )}

      {/* Trgovina Modal */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-yellow-500 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xl font-black text-yellow-400 tracking-wide">BAJTE SHOP 🛒</h2>
              <div className="text-yellow-400 font-bold text-sm">⭐ {stars} ZVIJEZDA</div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span>⚡ Veće Gorivo ({shopUpgrades.fuelMax})</span>
                <button onClick={() => buyUpgrade('fuel', 15)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg font-black text-xs">15 ⭐</button>
              </div>
              <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span>🛡️ Oklop (x{shopUpgrades.armor.toFixed(1)})</span>
                <button onClick={() => buyUpgrade('armor', 20)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg font-black text-xs">20 ⭐</button>
              </div>
              <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span>🚀 Brzina ({shopUpgrades.speed.toFixed(1)})</span>
                <button onClick={() => buyUpgrade('speed', 25)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg font-black text-xs">25 ⭐</button>
              </div>
              <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span>🔫 Oružje (Nivo {shopUpgrades.weapon})</span>
                <button onClick={() => buyUpgrade('weapon', 40)} className="bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-lg font-black text-xs">40 ⭐</button>
              </div>
            </div>

            <button
              onClick={() => setShopOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              ZATVORI TRGOVINU
            </button>
          </div>
        </div>
      )}

      {/* Pobjeda Modal */}
      {victoryModal && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-green-500 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
            <h2 className="text-2xl font-black text-green-400 uppercase tracking-wide">{t.vicTitle}</h2>
            <p className="text-sm text-slate-300">{t.vicMsg.replace('{name}', playerName)}</p>
            <div className="text-6xl animate-bounce my-2">{rescuedAnimal}</div>
            <button
              onClick={() => {
                setVictoryModal(false);
                setLevel(prev => prev + 1);
                setGameStarted(true);
              }}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-3.5 rounded-xl uppercase text-sm shadow-[0_0_15px_rgba(34,197,94,0.5)] transition"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}

      {/* Poraz Modal */}
      {gameOverModal && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <h2 className="text-2xl font-black text-red-500 uppercase tracking-wide">{t.goTitle}</h2>
            <p className="text-sm text-slate-300">{t.goMsg}</p>
            <button
              onClick={() => {
                setGameOverModal(false);
                setGameStarted(true);
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3.5 rounded-xl uppercase text-sm shadow-[0_0_15px_rgba(239,68,68,0.5)] transition"
            >
              {t.retry}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
