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
 * Compara se duas datas são o mesmo dia no tz do usuário
 */
export const isSameDayBR = (date1, date2) => {
  if (!date1 || !date2) return false;
  return getLocalDayKey(date1) === getLocalDayKey(date2);
};

/**
 * Converte string ISO (UTC) para formato "dd/MM/yyyy" no tz do usuário
 */
export const isoToDateBR = (isoString) => {
  if (!isoString) return "";
  return formatDateBR(isoString, "dd/MM/yyyy");
};

/**
 * Agrupa mensagens por dia no tz do usuário
 * @returns {Object} - { "2026-03-05": [...msgs], ... }
 */
export const groupMessagesByDateBR = (messages) => {
  if (!messages || !Array.isArray(messages)) return {};
  
  const grouped = {};
  messages.forEach(msg => {
    if (!msg.created_date) return;
    const dateKey = getLocalDayKey(msg.created_date);
    if (!dateKey) return;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(msg);
  });
  
  return grouped;
};

/**
 * Gera rótulo amigável para separador de data no chat
 * @param {string} dateKey - "2026-03-05" (chave YYYY-MM-DD gerada por getLocalDayKey)
 * @returns {string} - "Hoje", "Ontem", ou "05 de Março"
 */
export const getDateLabelBR = (dateKey) => {
  if (!dateKey) return "";
  try {
    const todayKey = getTodayKeyBR();
    if (dateKey === todayKey) return "Hoje";

    // Calcular "ontem" no tz local: subtrair 1 dia do instante atual
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayKey = getLocalDayKey(yesterdayDate);
    if (dateKey === yesterdayKey) return "Ontem";

    const [, month, day] = dateKey.split("-").map(Number);
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${day} de ${monthNames[month - 1]}`;
  } catch {
    return dateKey;
  }
};

/**
 * Formata a hora de um chat list item (Hoje → HH:mm, Ontem → "Ontem", senão dd/MM/yy)
 * Usa tz do usuário.
 */
export const formatChatListTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const dateKey = getLocalDayKey(dateStr);
    const todayKey = getTodayKeyBR();
    if (dateKey === todayKey) return formatChatTime(dateStr);

    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayKey = getLocalDayKey(yesterdayDate);
    if (dateKey === yesterdayKey) return "Ontem";

    return formatDateBR(dateStr, "dd/MM/yy");
  } catch {
    return "";
  }
};

/**
 * Parseia uma string "YYYY-MM-DD" como data local (sem offset de timezone)
 * Usa para campos type="date" que retornam strings sem horário
 */
export const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // meio-dia UTC evita saltar dia
};