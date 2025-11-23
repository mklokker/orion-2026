import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const input = await req.json();

    const {
      cidade,
      bairro,
      sub_bairro,
      area_lote,
      area_construida,
      vida_util,
      idade_aparente,
      padrao_semelhante,
      estado_conservacao,
      fator_comercializacao,
    } = input;

    // 1. Validações básicas
    if (!cidade || !bairro || !sub_bairro || !area_lote) {
      return Response.json({ 
        error: "Preencha cidade, bairro, sub-bairro e área do lote." 
      }, { status: 400 });
    }

    const areaLoteNum = parseFloat(area_lote);
    const areaConstrNum = area_construida ? parseFloat(area_construida) : 0;

    // 2. Buscar valor_m2
    const registrosM2 = await base44.asServiceRole.entities.ValorM2.filter({
      cidade,
      bairro,
      sub_bairro,
      ativo: true,
    });

    if (!registrosM2.length) {
      return Response.json({ 
        error: "Não há valor de m² cadastrado para esta localização." 
      }, { status: 400 });
    }

    const valorM2 = registrosM2[0].valor_m2;

    // 3. Fator de mercado
    let fatorMercadoValor = 1.0;
    const fatores = await base44.asServiceRole.entities.FatorMercado.filter({
      descricao: fator_comercializacao,
      ativo: true,
    });
    if (fatores.length) {
      fatorMercadoValor = fatores[0].fator;
    }

    // 4. Padrão semelhante
    let valorPadrao = 0;
    if (padrao_semelhante && padrao_semelhante !== "Lote") {
      const padroes = await base44.asServiceRole.entities.PadraoSemelhante.filter({
        descricao: padrao_semelhante,
        ativo: true,
      });
      if (padroes.length) {
        valorPadrao = padroes[0].valor;
      }
    }

    // 5. Depreciação Ross-Heidecke
    let percDepreciacao = 0;

    function vidaUtilEmAnos(vida) {
      if (!vida || vida === "Lote") return 50;
      if (vida.includes("60 anos")) return 60;
      if (vida.includes("65 anos")) return 65;
      if (vida.includes("45 anos")) return 45;
      if (vida.includes("50 anos")) return 50;
      if (vida.includes("70 anos")) return 70;
      return 50;
    }

    function EVEN(num) {
      const x = Math.ceil(num);
      return x % 2 === 0 ? x : x + 1;
    }

    function extrairLetraEstado(estado) {
      if (!estado) return "C";
      return estado.trim().charAt(0).toUpperCase();
    }

    if (areaConstrNum > 0 && idade_aparente && parseInt(idade_aparente) > 0) {
      const vidaUtilAnos = vidaUtilEmAnos(vida_util);
      const idadeAnos = parseInt(idade_aparente, 10);

      let percVidaUtil = (idadeAnos / vidaUtilAnos) * 100;
      if (percVidaUtil < 0) percVidaUtil = 0;
      if (percVidaUtil > 100) percVidaUtil = 100;

      let percEven = EVEN(percVidaUtil);
      if (percEven < 2) percEven = 2;
      if (percEven > 100) percEven = 100;

      const letraEstado = extrairLetraEstado(estado_conservacao);

      const ross = await base44.asServiceRole.entities.TabelaDepreciacaoRoss.filter({
        percentual: percEven,
        estado: letraEstado,
        ativo: true,
      });

      if (ross.length) {
        const K = ross[0].k;
        percDepreciacao = K / 100.0;
      }
    }

    // 6. Valor base
    const areaCalculo = areaConstrNum > 0 ? areaConstrNum : areaLoteNum;
    const valorBase = areaCalculo * valorM2;

    // 7. Aplicar depreciação
    const valorDepreciado = valorBase * (1 - percDepreciacao);

    // 8. Somar padrão
    const valorComPadrao = valorDepreciado + valorPadrao;

    // 9. Fator de mercado
    const valorFinal = valorComPadrao * fatorMercadoValor;

    // Funções de arredondamento para milhar
    const arredondarMilhar = (v) => Math.round(v / 1000) * 1000;
    const arredondarMilharParaBaixo = (v) => Math.floor(v / 1000) * 1000;
    const arredondarMilharParaCima = (v) => Math.ceil(v / 1000) * 1000;

    const valorVendaSugerido = arredondarMilhar(valorFinal);
    const limiteInferior = arredondarMilharParaBaixo(valorFinal * 0.75);
    const limiteSuperior = arredondarMilharParaCima(valorFinal * 1.25);
    const valorMedioLote = areaLoteNum * valorM2;

    return Response.json({
      valor_benfeitoria: Math.round(valorDepreciado * 100) / 100,
      valor_medio_lote: Math.round(valorMedioLote * 100) / 100,
      valor_medio_venda: valorVendaSugerido,
      limite_inferior: limiteInferior,
      limite_superior: limiteSuperior,
    });

  } catch (error) {
    console.error("Erro ao calcular avaliação:", error);
    return Response.json({ 
      error: error.message || "Erro ao calcular avaliação" 
    }, { status: 500 });
  }
});