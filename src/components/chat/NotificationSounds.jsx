// Sistema de sons de notificação usando Web Audio API
// Requer interação do usuário para funcionar em alguns navegadores

let audioContext = null;
let audioUnlocked = false;

const SOUND_CONFIGS = {
  default: { frequency: 800, duration: 150, type: 'double' },
  chime: { frequency: 1200, duration: 200, type: 'single' },
  bell: { frequency: 600, duration: 300, type: 'single' },
  pop: { frequency: 1000, duration: 80, type: 'single' },
  ding: { frequency: 880, duration: 250, type: 'double' },
  none: null
};

// Inicializa o contexto de áudio (deve ser chamado após interação do usuário)
export const initAudioContext = () => {
  if (audioContext) return audioContext;
  
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume se estiver suspenso
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    audioUnlocked = true;
    localStorage.setItem('audioUnlocked', 'true');
    return audioContext;
  } catch (e) {
    console.error("Erro ao criar AudioContext:", e);
    return null;
  }
};

// Desbloqueia o áudio com interação do usuário
export const unlockAudio = async () => {
  if (audioUnlocked && audioContext?.state === 'running') return true;
  
  try {
    const ctx = initAudioContext();
    if (!ctx) return false;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Toca um som silencioso para desbloquear
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.gain.value = 0; // Silencioso
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.001);
    
    audioUnlocked = true;
    localStorage.setItem('audioUnlocked', 'true');
    return true;
  } catch (e) {
    console.error("Erro ao desbloquear áudio:", e);
    return false;
  }
};

// Verifica se o áudio está desbloqueado
export const isAudioUnlocked = () => {
  return audioUnlocked || localStorage.getItem('audioUnlocked') === 'true';
};

export const playNotificationSound = (soundType = "default") => {
  if (soundType === "none" || !SOUND_CONFIGS[soundType]) return;
  
  const config = SOUND_CONFIGS[soundType];
  if (!config) return;

  try {
    // Inicializa contexto se não existir
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume se suspenso
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const playTone = (freq, startTime, dur) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + dur / 1000);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + dur / 1000);
    };

    const now = audioContext.currentTime;
    
    if (config.type === 'double') {
      playTone(config.frequency, now, config.duration);
      playTone(config.frequency * 1.2, now + 0.15, config.duration);
    } else {
      playTone(config.frequency, now, config.duration);
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao tocar som:", error);
    return false;
  }
};

export const preloadSounds = () => {
  // Nada a precarregar, sons são gerados dinamicamente
};

export const getSoundLabel = (soundType) => {
  const labels = {
    default: "Padrão",
    chime: "Sino",
    bell: "Campainha",
    pop: "Pop",
    ding: "Ding",
    none: "Sem som"
  };
  return labels[soundType] || "Padrão";
};

export const SOUND_OPTIONS = [
  { value: "default", label: "Padrão" },
  { value: "chime", label: "Sino" },
  { value: "bell", label: "Campainha" },
  { value: "pop", label: "Pop" },
  { value: "ding", label: "Ding" },
  { value: "none", label: "Sem som" }
];