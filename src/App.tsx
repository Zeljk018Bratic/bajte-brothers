import React, { useEffect, useRef, useState } from 'react';

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lang, setLang] = useState<'HR' | 'EN' | 'DE' | 'IT'>('HR');
  const [playerName, setPlayerName] = useState('Heroj');
  const [selectedHero, setSelectedHero] = useState('Alex');
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [stars, setStars] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);
  const [gameOverModal, setGameOverModal] = useState(false);
  const [rescuedAnimal, setRescuedAnimal] = useState('🦊');

  // Nadogradnje u Shopu
  const [shopUpgrades, setShopUpgrades] = useState({
    fuelMax: 100,
    armor: 1,
    speed: 5.5,
    weapon: 1 // 1: Standard, 2: Triple, 3: EMP
  });

  const translations = {
    HR: { title: "BAJTE BROTHERS 3.0", heroName: "Ime Heroja:", selectHero: "Odaberi Heroja:", start: "KRENI U MISIJU! 🚀", shop: "BAJTE SHOP 🛒", continue: "NASTAVI (Nivo {lvl})", next: "SLJEDEĆI NIVO ➔", retry: "POKUŠAJ PONOVNO 🔄", vicTitle: "ŽIVOTINJA SPAŠENA! 🎉", vicMsg: "Bravo {name}! Spasio si životinju!", goTitle: "MISIJA NIJE USPJELA!", goMsg: "Bager je ostao bez HP-a ili goriva!" },
    EN: { title: "BAJTE BROTHERS 3.0", heroName: "Hero Name:", selectHero: "Select Hero:", start: "START MISSION! 🚀", shop: "BAJTE SHOP 🛒", continue: "CONTINUE (Lvl {lvl})", next: "NEXT LEVEL ➔", retry: "TRY AGAIN 🔄", vicTitle: "ANIMAL RESCUED! 🎉", vicMsg: "Great job {name}! Animal saved!", goTitle: "MISSION FAILED!", goMsg: "Out of fuel or HP!" },
    DE: { title: "BAJTE BROTHERS 3.0", heroName: "Heldenname:", selectHero: "Held wählen:", start: "MISSION STARTEN! 🚀", shop: "BAJTE SHOP 🛒", continue: "WEITER (Lvl {lvl})", next: "NÄCHSTES LEVEL ➔", retry: "NOCHMAL 🔄", vicTitle: "TIER GERETTET! 🎉", vicMsg: "Super {name}! Tier gerettet!", goTitle: "MISSION FEHLGESCHLAGEN!", goMsg: "Kein Treibstoff mehr!" },
    IT: { title: "BAJTE BROTHERS 3.0", heroName: "Nome Eroe:", selectHero: "Scegli Eroe:", start: "INIZIA MISSIONE! 🚀", shop: "BAJTE SHOP 🛒", continue: "CONTINUA (Lvl {lvl})", next: "PROSSIMO LIVELLO ➔", retry: "RIPROVA 🔄", vicTitle: "ANIMALE SALVATO! 🎉", vicMsg: "Grande {name}! Animale salvato!", goTitle: "MISSIONE FALLITA!", goMsg: "Senza carburante!" }
  };

  const t = translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem('bajteBrothers_save_3_0');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.playerName) setPlayerName(data.playerName);
        if (data.selectedHero) setSelectedHero(data.selectedHero);
        if (data.level) setLevel(data.level);
        if (data.stars) setStars(data.stars);
        if (data.shopUpgrades) setShopUpgrades(data.shopUpgrades);
      } catch (e) {
        console.error("Error loading save data:", e);
      }
    }
  }, []);

  const saveGame = (newLvl = level, newStars = stars, newUpgrades = shopUpgrades) => {
    const data = {
      playerName,
      selectedHero,
      level: newLvl,
      stars: newStars,
      shopUpgrades: newUpgrades
    };
    localStorage.setItem('bajteBrothers_save_3_0', JSON.stringify(data));
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
  };

  useEffect(() => {
    if (!gameStarted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const GAME_W = 1280;
    const GAME_H = 720;

    let hp = 100;
    let fuel = shopUpgrades.fuelMax;
    let playerX = 120, playerY = GAME_H / 2;
    let angle = 0;
    let speed = 0;
    let keys: Record<string, boolean> = {};
    let hasKey = false;

    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const resize = () => {
      const scale = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
      canvas.width = GAME_W * scale;
      canvas.height = GAME_H * scale;
      ctx.resetTransform();
      ctx.scale(scale, scale);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      ctx.clearRect(0, 0, GAME_W, GAME_H);

      // Grid background
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
      for (let x = 0; x < GAME_W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_H); ctx.stroke();
      }
      for (let y = 0; y < GAME_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke();
      }

      // Player Movement
      let dx = 0, dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;

      if ((dx !== 0 || dy !== 0) && fuel > 0) {
        angle = Math.atan2(dy, dx);
        speed = Math.min(speed + 0.3, shopUpgrades.speed);
        fuel = Math.max(0, fuel - 0.05);
      } else {
        speed *= 0.92;
      }

      playerX += Math.cos(angle) * speed;
      playerY += Math.sin(angle) * speed;

      playerX = Math.max(20, Math.min(GAME_W - 20, playerX));
      playerY = Math.max(20, Math.min(GAME_H - 20, playerY));

      // Key rendering
      if (!hasKey) {
        ctx.font = '28px sans-serif';
        ctx.fillText('🔑', GAME_W / 2, 100);
        if (Math.hypot(playerX - GAME_W / 2, playerY - 100) < 40) {
          hasKey = true;
        }
      }

      // Cage rendering
      ctx.font = '36px sans-serif';
      ctx.fillText(rescuedAnimal, GAME_W - 120, GAME_H / 2);
      ctx.strokeStyle = hasKey ? '#00ff66' : '#ff0055';
      ctx.lineWidth = 3;
      ctx.strokeRect(GAME_W - 150, GAME_H / 2 - 30, 60, 60);

      if (Math.hypot(playerX - (GAME_W - 120), playerY - GAME_H / 2) < 50 && hasKey) {
        setVictoryModal(true);
        setGameStarted(false);
        saveGame(level + 1, stars + 10, shopUpgrades);
        return;
      }

      // Player rendering
      ctx.save();
      ctx.translate(playerX, playerY);
      ctx.rotate(angle);
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(-20, -15, 40, 30);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -8, 15, 16);
      ctx.restore();

      // Check Game Over
      if (fuel <= 0 || hp <= 0) {
        setGameOverModal(true);
        setGameStarted(false);
        return;
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [gameStarted, level, shopUpgrades]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020208] text-white font-sans flex justify-center items-center">
      <canvas ref={canvasRef} className="block shadow-[0_0_30px_rgba(0,243,255,0.3)] rounded" />

      {/* HUD overlay */}
      {gameStarted && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-cyan-500/30 backdrop-blur">
          <div className="flex gap-4 text-xs font-bold text-cyan-400">
            <div>NIVO: {level}</div>
            <div>⭐ ZVIJEZDE: {stars}</div>
            <div>👤 {playerName} ({selectedHero})</div>
          </div>
          <button
            onClick={() => setShopOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1 rounded font-bold text-sm"
          >
            TRGOVINA 🛒
          </button>
        </div>
      )}

      {/* Main Menu */}
      {!gameStarted && !victoryModal && !gameOverModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-cyan-500 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-[0_0_30px_rgba(0,243,255,0.4)]">
            <h1 className="text-2xl font-black text-cyan-400 tracking-wider uppercase">{t.title}</h1>

            <div className="flex justify-center gap-2">
              {(['HR', 'EN', 'DE', 'IT'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded font-bold text-xs border ${lang === l ? 'bg-cyan-500 border-cyan-300 text-black' : 'bg-slate-800 border-slate-600 text-white'}`}
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
                className="w-full mt-1 bg-black/60 border border-cyan-500 rounded p-2 text-white outline-none"
              />
            </div>

            <div className="text-left">
              <label className="text-xs text-slate-400 uppercase font-bold">{t.selectHero}</label>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {['Alex', 'Mia', 'Kevin', 'Lara', 'Nova'].map(h => (
                  <button
                    key={h}
                    onClick={() => setSelectedHero(h)}
                    className={`p-2 rounded border text-center ${selectedHero === h ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300' : 'border-slate-700 bg-slate-800/50'}`}
                  >
                    <div className="text-lg">🤖</div>
                    <div className="text-[10px] font-bold mt-1">{h}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setGameStarted(true); saveGame(); }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black py-3 rounded-xl uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(0,243,255,0.5)] transition"
            >
              {t.start}
            </button>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {shopOpen && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-yellow-500 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h2 className="text-xl font-black text-yellow-400">BAJTE SHOP 🛒</h2>
              <div className="text-yellow-400 font-bold">⭐ {stars}</div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                <span>⚡ Veće Gorivo ({shopUpgrades.fuelMax})</span>
                <button onClick={() => buyUpgrade('fuel', 15)} className="bg-yellow-500 text-black px-2 py-1 rounded font-bold text-xs">15 ⭐</button>
              </div>
              <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                <span>🛡️ Oklop (x{shopUpgrades.armor.toFixed(1)})</span>
                <button onClick={() => buyUpgrade('armor', 20)} className="bg-yellow-500 text-black px-2 py-1 rounded font-bold text-xs">20 ⭐</button>
              </div>
              <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                <span>🚀 Brzina ({shopUpgrades.speed.toFixed(1)})</span>
                <button onClick={() => buyUpgrade('speed', 25)} className="bg-yellow-500 text-black px-2 py-1 rounded font-bold text-xs">25 ⭐</button>
              </div>
            </div>

            <button
              onClick={() => setShopOpen(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg text-xs"
            >
              ZATVORI TRGOVINU
            </button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {victoryModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-green-500 rounded-2xl p-6 max-w-md w-full text-center space-y-4">
            <h2 className="text-2xl font-black text-green-400 uppercase">{t.vicTitle}</h2>
            <p className="text-sm text-slate-300">{t.vicMsg.replace('{name}', playerName)}</p>
            <div className="text-5xl">{rescuedAnimal}</div>
            <button
              onClick={() => {
                setVictoryModal(false);
                setLevel(prev => prev + 1);
                setGameStarted(true);
              }}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-3 rounded-xl uppercase text-sm"
            >
              {t.next}
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameOverModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur flex justify-center items-center z-50">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full text-center space-y-4">
            <h2 className="text-2xl font-black text-red-500 uppercase">{t.goTitle}</h2>
            <p className="text-sm text-slate-300">{t.goMsg}</p>
            <button
              onClick={() => {
                setGameOverModal(false);
                setGameStarted(true);
              }}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl uppercase text-sm"
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
