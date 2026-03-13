/**
 * Utilitários para importação segura de Ofícios
 * 
 * Funções para normalização e detecção de duplicidade
 */

/**
 * Normaliza texto para comparação:
 * - Remove espaços extras
 * - Converte para minúsculas
 * - Remove caracteres especiais comuns
 */
export function normalizeText(text) {
  if (!text) return "";
  
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // Múltiplos espaços → um espaço
    .replace(/[^\w\s]/g, "") // Remove pontuação
    .trim();
}

/**
 * Normaliza número de ofício de forma especial
 * 
 * Trata casos especiais como:
 * - s/n
 * - declaração
 * - portaria
 * - cont.
 */
export function normalizeNumeroOficio(numero) {
  if (!numero) return "";
  
  const normalized = normalizeText(numero);
  
  // Casos especiais que não devem ser usados sozinhos como identificador único
  const specialCases = ["sn", "declaracao", "portaria", "cont", "sem numero"];
  
  return {
    normalized,
    isSpecial: specialCases.some(sc => normalized.includes(sc)),
  };
}

/**
 * Constrói uma assinatura única para o ofício baseada em múltiplos campos
 */
export function buildOficioSignature(oficio) {
  const numero = normalizeNumeroOficio(oficio.numero_oficio || "");
  const ano = normalizeText(oficio.ano_oficio || "");
  const assunto = normalizeText(oficio.assunto || "");
  const dataEnvio = oficio.data_envio_malote || "";
  
  return {
    numero: numero.normalized,
    numeroIsSpecial: numero.isSpecial,
    ano,
    assunto,
    dataEnvio,
    // Assinatura principal (número + ano + assunto)
    mainSignature: `${numero.normalized}|${ano}|${assunto}`,
    // Assinatura reforçada (com data)
    strongSignature: `${numero.normalized}|${ano}|${assunto}|${dataEnvio}`,
  };
}

/**
 * Verifica se dois ofícios são duplicados
 * 
 * LÓGICA DE DUPLICIDADE (conservadora):
 * 
 * REGRA A — DUPLICIDADE FORTE:
 * numero_oficio + ano_oficio + assunto idênticos
 * 
 * REGRA B — DUPLICIDADE FORTE COM DATA:
 * numero_oficio + ano_oficio + assunto muito similares + data_envio_malote igual
 * 
 * REGRA C — CASOS ESPECIAIS:
 * Para números "especiais" (s/n, declaração, portaria, cont.):
 * - Exige assunto + data para confirmar duplicidade
 * - Não confiar apenas no número
 * 
 * REGRA D — SEGURANÇA:
 * Em caso de dúvida, NÃO considerar duplicado (evitar falso positivo)
 */
export function isDuplicateOficio(newOficio, existingOficios) {
  const newSig = buildOficioSignature(newOficio);
  
  for (const existing of existingOficios) {
    const existingSig = buildOficioSignature(existing);
    
    // REGRA A — Match exato de número + ano + assunto
    if (
      newSig.numero && 
      existingSig.numero && 
      newSig.numero === existingSig.numero &&
      newSig.ano === existingSig.ano &&
      newSig.assunto === existingSig.assunto
    ) {
      // Se o número NÃO é especial, isso é suficiente
      if (!newSig.numeroIsSpecial && !existingSig.numeroIsSpecial) {
        return existing;
      }
      
      // Se o número É especial, exigir também data igual
      if (newSig.dataEnvio && existingSig.dataEnvio && newSig.dataEnvio === existingSig.dataEnvio) {
        return existing;
      }
    }
    
    // REGRA B — Match forte com data (mesmo com pequena variação textual)
    if (
      newSig.numero && 
      existingSig.numero && 
      newSig.numero === existingSig.numero &&
      newSig.ano === existingSig.ano &&
      newSig.dataEnvio && 
      existingSig.dataEnvio &&
      newSig.dataEnvio === existingSig.dataEnvio
    ) {
      // Se assunto é muito similar (pelo menos 80% igual)
      if (newSig.assunto && existingSig.assunto) {
        const similarity = calculateSimilarity(newSig.assunto, existingSig.assunto);
        if (similarity >= 0.8) {
          return existing;
        }
      }
    }
    
    // REGRA C — Para casos especiais, ser ainda mais conservador
    // (já tratado acima com a exigência de data)
  }
  
  // REGRA D — Se chegou aqui, não é duplicado
  return null;
}

/**
 * Calcula similaridade simples entre dois textos (0 a 1)
 * Usa Jaccard similarity baseado em palavras
 */
function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const words1 = new Set(text1.split(" ").filter(w => w.length > 0));
  const words2 = new Set(text2.split(" ").filter(w => w.length > 0));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}