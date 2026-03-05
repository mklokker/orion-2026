/**
 * Normaliza string removendo acentos e convertendo para lowercase
 */
export function normalizeString(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Calcula score de match para um usuário dado um termo de busca
 * Prioriza matches no nome (display_name/full_name) vs email
 * Retorna score > 0 se há match, score mais alto = melhor match
 */
export function calculateUserSearchScore(user, searchTerm) {
  if (!searchTerm) return 0;

  const normalized = normalizeString(searchTerm);
  const nameNorm = normalizeString(user.display_name || user.full_name || "");
  const emailNorm = normalizeString(user.email || "");

  let score = 0;

  // Match no nome é 3x mais importante
  if (nameNorm.includes(normalized)) {
    // Se começa com o termo, score muito alto
    if (nameNorm.startsWith(normalized)) {
      score = 100;
    } else {
      score = 50;
    }
  }

  // Match no email: score menor
  if (emailNorm.includes(normalized)) {
    score = Math.max(score, emailNorm.startsWith(normalized) ? 30 : 10);
  }

  return score;
}

/**
 * Filtra e ordena usuários por score de busca
 */
export function filterAndSortUsersBySearch(users, searchTerm, excludeEmail = null) {
  if (!searchTerm) {
    return users.filter(u => !excludeEmail || u.email !== excludeEmail);
  }

  return users
    .filter(u => (!excludeEmail || u.email !== excludeEmail) && calculateUserSearchScore(u, searchTerm) > 0)
    .sort((a, b) => calculateUserSearchScore(b, searchTerm) - calculateUserSearchScore(a, searchTerm));
}

/**
 * Debounce wrapper para callbacks
 */
export function debounce(fn, delayMs = 300) {
  let timeoutId;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Get display name com fallback
 */
export function getUserDisplayName(user) {
  return user?.display_name || user?.full_name || user?.email?.split("@")[0] || "Usuário";
}

/**
 * Get initials para avatar
 */
export function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}