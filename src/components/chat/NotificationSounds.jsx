// Sound URLs - usando sons curtos de domínio público
const SOUND_URLS = {
  default: "https://cdn.pixabay.com/audio/2022/03/24/audio_d1718ab41b.mp3",
  chime: "https://cdn.pixabay.com/audio/2022/11/17/audio_fe06ac3556.mp3",
  bell: "https://cdn.pixabay.com/audio/2022/10/30/audio_db2ab87450.mp3",
  pop: "https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3",
  ding: "https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3",
  none: null
};

let audioCache = {};

export const playNotificationSound = (soundType = "default") => {
  if (soundType === "none" || !SOUND_URLS[soundType]) return;
  
  try {
    if (!audioCache[soundType]) {
      audioCache[soundType] = new Audio(SOUND_URLS[soundType]);
      audioCache[soundType].volume = 0.5;
    }
    
    audioCache[soundType].currentTime = 0;
    audioCache[soundType].play().catch(err => {
      console.log("Não foi possível tocar o som:", err);
    });
  } catch (error) {
    console.error("Erro ao tocar som:", error);
  }
};

export const preloadSounds = () => {
  Object.keys(SOUND_URLS).forEach(key => {
    if (SOUND_URLS[key]) {
      audioCache[key] = new Audio(SOUND_URLS[key]);
      audioCache[key].volume = 0.5;
    }
  });
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