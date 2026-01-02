// Sound URLs - usando sons base64 inline para garantir funcionamento
// Sons curtos e leves codificados em base64

const createBeepSound = (frequency = 800, duration = 150, volume = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
    
    return true;
  } catch (e) {
    console.error("Erro ao criar som:", e);
    return false;
  }
};

const SOUND_CONFIGS = {
  default: { frequency: 800, duration: 150, type: 'double' },
  chime: { frequency: 1200, duration: 200, type: 'single' },
  bell: { frequency: 600, duration: 300, type: 'single' },
  pop: { frequency: 1000, duration: 80, type: 'single' },
  ding: { frequency: 880, duration: 250, type: 'double' },
  none: null
};

export const playNotificationSound = (soundType = "default") => {
  if (soundType === "none" || !SOUND_CONFIGS[soundType]) return;
  
  const config = SOUND_CONFIGS[soundType];
  if (!config) return;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
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