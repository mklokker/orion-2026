/**
 * Utilitários de data/hora — timezone local do usuário (fallback America/Sao_Paulo)
 * Regra: Sempre salvar em UTC (ISO 8601 com Z), converter ao exibir
 */

/**
 * Detecta o timezone do navegador do usuário com fallback seguro
 */
export const getUserTimeZone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
};

/**
 * Formata data no timezone local do usuário
 * @param {Date|string} date - Data em ISO (UTC) ou Date object
 * @param {string} format - Padrão: "dd/MM/yyyy HH:mm"
 * @returns {string}
 */
export const formatDateBR = (date, format = "dd/MM/yyyy HH:mm") => {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    const tz = getUserTimeZone();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    
    const parts = formatter.formatToParts(dateObj);
    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    
    if (format === "dd/MM/yyyy") return `${p.day}/${p.month}/${p.year}`;
    if (format === "HH:mm") return `${p.hour}:${p.minute}`;
    if (format === "dd/MM/yy") return `${p.day}/${p.month}/${p.year.slice(-2)}`;
    if (format === "dd/MM HH:mm") return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
  } catch (error) {
    console.error("[dateUtils] Erro ao formatar data:", date, error);
    return "";
  }
};

/**
 * Alias conveniente — formata só a hora HH:mm no tz do usuário
 */
export const formatChatTime = (dateStr) => formatDateBR(dateStr, "HH:mm");

/**
 * Retorna a chave do dia (YYYY-MM-DD) no tz do usuário para uma data/hora ISO
 * Essencial para agrupar mensagens e comparar dias sem erros de UTC
 */
export const getLocalDayKey = (dateStr) => {
  if (!dateStr) return "";
  try {
    const dateObj = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(dateObj.getTime())) return "";
    const tz = getUserTimeZone();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(dateObj);
    const y = parts.find(p => p.type === "year").value;
    const m = parts.find(p => p.type === "month").value;
    const d = parts.find(p => p.type === "day").value;
    return `${y}-${m}-${d}`;
  } catch {
    return "";
  }
};

/**
 * Retorna a chave YYYY-MM-DD de "hoje" no tz do usuário
 */
export const getTodayKeyBR = () => getLocalDayKey(new Date());

/**
 * Compara se duas datas são o mesmo dia em timezone Brasil
 * @param {Date|string} date1 - Data 1 (ISO ou Date)
 * @param {Date|string} date2 - Data 2 (ISO ou Date)
 * @returns {boolean}
 */
export const isSameDayBR = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  const date1Str = formatter.format(d1);
  const date2Str = formatter.format(d2);
  
  return date1Str === date2Str;
};

/**
 * Converte string ISO (UTC) para formato "dd/MM/yyyy" em timezone Brasil
 * @param {string} isoString - "2026-03-05T10:30:00Z"
 * @returns {string} - "05/03/2026"
 */
export const isoToDateBR = (isoString) => {
  if (!isoString) return "";
  return formatDateBR(isoString, "dd/MM/yyyy");
};

/**
 * Agrupa mensagens por data em timezone Brasil
 * @param {Array} messages - Array de mensagens com created_date em ISO
 * @returns {Object} - { "2026-03-05": [...msgs], "2026-03-04": [...msgs] }
 */
export const groupMessagesByDateBR = (messages) => {
  if (!messages || !Array.isArray(messages)) return {};
  
  const grouped = {};
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  messages.forEach(msg => {
    const dateObj = typeof msg.created_date === "string" 
      ? new Date(msg.created_date) 
      : msg.created_date;
    
    const parts = formatter.formatToParts(dateObj);
    const year = parts.find(p => p.type === "year").value;
    const month = parts.find(p => p.type === "month").value;
    const day = parts.find(p => p.type === "day").value;
    const dateKey = `${year}-${month}-${day}`;
    
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(msg);
  });
  
  return grouped;
};

/**
 * Formata label amigável para separador de data em chat
 * @param {string} dateStr - "2026-03-05"
 * @returns {string} - "Hoje", "Ontem", ou "05 de Março"
 */
export const getDateLabelBR = (dateStr) => {
  if (!dateStr) return "";
  
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    
    const today = getTodayBR();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDayBR(date, today)) {
      return "Hoje";
    }
    if (isSameDayBR(date, yesterday)) {
      return "Ontem";
    }
    
    // Formatar "05 de Março"
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    return `${day} de ${monthNames[month - 1]}`;
  } catch (error) {
    console.error("[dateUtils] Erro ao formatar label:", dateStr, error);
    return dateStr;
  }
};

/**
 * Parseia uma string "YYYY-MM-DD" como data local (sem offset de timezone)
 * Usa para campos type="date" que retornam strings sem horário
 * @param {string} dateString - "2026-03-05"
 * @returns {Date}
 */
export const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  // Criar em UTC para manter consistência
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
};