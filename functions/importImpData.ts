import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Função para converter string "NULL" em null real
    const parseValue = (val) => {
      if (!val || val === "NULL" || val.trim() === "") return null;
      return val;
    };

    const parseNumber = (val) => {
      if (!val || val === "NULL" || val.trim() === "") return null;
      const num = parseFloat(val.replace(',', '.'));
      return isNaN(num) ? null : num;
    };

    // Mapear padrões para as opções do sistema
    const mapPadrao = (padrao) => {
      if (!padrao || padrao === "NULL" || padrao === "Lote") return "Lote";
      if (padrao.includes("baixo")) return "Baixo";
      if (padrao.includes("normal")) return "Normal";
      if (padrao.includes("alto") || padrao.includes("luxo")) return "Alto";
      return "Normal";
    };

    const mapEstado = (estado) => {
      if (!estado || estado === "NULL") return null;
      if (estado.includes("Novo")) return "Novo";
      if (estado.includes("novo e regular")) return "Bom";
      if (estado.includes("Regular") || estado.includes("regular e reparos")) return "Regular";
      return "Ruim";
    };

    const mapVidaUtil = (vida) => {
      if (!vida || vida === "NULL" || vida === "Lote") return "Lote";
      if (vida.includes("Casa") || vida.includes("65 anos")) return "Casa";
      if (vida.includes("Apartamento") || vida.includes("60 anos")) return "Apartamento";
      if (vida.includes("70 anos") || vida.includes("Lojas") || vida.includes("Galpões")) return "Comercial";
      return "Lote";
    };

    const { data } = await req.json();

    if (!data || !Array.isArray(data)) {
      return Response.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const avaliacoes = data.map(item => ({
      regiao: parseValue(item.regiao),
      bairro: parseValue(item.bairro),
      sub_bairro: parseValue(item.sub_bairro),
      area_lote: parseNumber(item.area),
      area_construida: parseNumber(item.area_construida),
      vida_util: mapVidaUtil(item.vida_util),
      idade_aparente: parseNumber(item.idade_aparente),
      padrao_semelhante: mapPadrao(item.padrao_semelhante),
      estado_conservacao: mapEstado(item.estado_conservacao),
      fator_comercializacao: "Normal", // Default
      valor_benfeitoria: parseNumber(item.valor_benfeitoria),
      valor_medio_lote: parseNumber(item.valor_medio_lote),
      valor_medio_venda: parseNumber(item.valor_medio_venda),
      limite_inferior: parseNumber(item.limite_inferior),
      limite_superior: parseNumber(item.limite_superior),
      nome_cliente: parseValue(item.nome),
      cpf_cliente: parseValue(item.cpf),
      endereco_cliente: parseValue(item.endereco),
      telefone_cliente: parseValue(item.telefone),
      valor_considerado: parseNumber(item.valor_considerado)
    })).filter(av => av.regiao && av.bairro && av.area_lote > 0);

    // Inserir em lotes de 50
    const BATCH_SIZE = 50;
    let inserted = 0;

    for (let i = 0; i < avaliacoes.length; i += BATCH_SIZE) {
      const batch = avaliacoes.slice(i, i + BATCH_SIZE);
      await base44.asServiceRole.entities.AvaliacaoImovel.bulkCreate(batch);
      inserted += batch.length;
    }

    return Response.json({ 
      success: true, 
      inserted: inserted,
      total: avaliacoes.length
    });
  } catch (error) {
    console.error("Erro ao importar dados:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});