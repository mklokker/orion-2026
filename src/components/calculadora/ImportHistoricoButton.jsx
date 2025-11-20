import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { importImpData } from "@/functions/importImpData";

export default function ImportHistoricoButton({ onImportComplete }) {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    // Dados históricos da planilha IMP (primeiros 50 para teste)
    const historicoData = [
      {regiao: "São_João_Del_Rei", bairro: "Tejuco", sub_bairro: "São José Operário", area: "300", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "61708.5", valor_medio_venda: "62000", limite_inferior: "46000", limite_superior: "78000", valor_considerado: "113331", nome: null, cpf: null, endereco: "Rua Inácio do Nascimento", telefone: null},
      {regiao: "Tiradentes", bairro: "Águas Santas", sub_bairro: null, area: "450", area_construida: "174.31", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "1", padrao_semelhante: "R1N - Residência unifamiliar padrão normal", estado_conservacao: "A - Novo", valor_benfeitoria: "550878.4696", valor_medio_lote: "112221.45", valor_medio_venda: "663000", limite_inferior: "497000", limite_superior: "829000", valor_considerado: "325000", nome: null, cpf: null, endereco: "Rua São Vicente de Paula, 210", telefone: null},
      {regiao: "São_Tiago", bairro: "Santo Antônio - ST", sub_bairro: null, area: "240", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "49526.64", valor_medio_venda: "50000", limite_inferior: "37000", limite_superior: "63000", valor_considerado: "65000", nome: null, cpf: null, endereco: "Rua E,  lote 11, quadra Q", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Bonfim", sub_bairro: "Vila Maria", area: "184.84", area_construida: "185", vida_util: "Apartamentos, Kitnets, Garagens, Const. Rurais – 60 anos", idade_aparente: "2", padrao_semelhante: "R8N - Residência multifamiliar, padrão normal", estado_conservacao: "B - Entre novo e regular", valor_benfeitoria: "480738.0204", valor_medio_lote: "94062.67308", valor_medio_venda: "575000", limite_inferior: "431000", limite_superior: "719000", valor_considerado: "270000", nome: null, cpf: null, endereco: "Rua Rubens Santiago Santos, 27", telefone: null},
      {regiao: "Conceição_da_Barra_de_Minas", bairro: "Centro_CBM", sub_bairro: null, area: "637.87", area_construida: "100.92", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "45", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "F - Entre reparos simples e importantes", valor_benfeitoria: "73309.3516", valor_medio_lote: "245420.4825", valor_medio_venda: "319000", limite_inferior: "239000", limite_superior: "399000", valor_considerado: "200000", nome: null, cpf: null, endereco: "Rua Nossa Senhora de Fátima, 147", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Matosinhos", sub_bairro: ".Geral - Matosinhos", area: "470.3", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "224405.0559", valor_medio_venda: "224000", limite_inferior: "168000", limite_superior: "280000", valor_considerado: "640000", nome: null, cpf: null, endereco: "Avenida Sete de Setembro", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Jardim_Central", sub_bairro: ".Geral - Jardim Central", area: "135", area_construida: "65.74", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "22", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "F - Entre reparos simples e importantes", valor_benfeitoria: "90926.87115", valor_medio_lote: "68738.625", valor_medio_venda: "160000", limite_inferior: "120000", limite_superior: "200000", valor_considerado: "135000", nome: null, cpf: null, endereco: "Rua Eurico de Oliveira, 302", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Colônia_do_Marçal", sub_bairro: "Nossa Senhora da Conceição", area: "252", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "87118.416", valor_medio_venda: "87000", limite_inferior: "65000", limite_superior: "109000", valor_considerado: "65000", nome: null, cpf: null, endereco: "Lote D", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Colônia_do_Marçal", sub_bairro: "Nossa Senhora da Conceição", area: "216", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "74672.928", valor_medio_venda: "75000", limite_inferior: "56000", limite_superior: "94000", valor_considerado: "45000", nome: null, cpf: null, endereco: "Lote A", telefone: null},
      {regiao: "Rural", bairro: "Rural_Ritápolis", sub_bairro: "Ritápolis_Silvicultura ou Pastagem Natural", area: "23.1593", area_construida: null, vida_util: null, idade_aparente: null, padrao_semelhante: null, estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "185274.4", valor_medio_venda: "185000", limite_inferior: "138000", limite_superior: "232000", valor_considerado: "154553", nome: null, cpf: null, endereco: "Vila Tapera", telefone: null},
      {regiao: "Rural", bairro: "Rural_Nazareno", sub_bairro: "Nazareno_Silvicultura ou Pastagem Natural", area: "5", area_construida: null, vida_util: null, idade_aparente: null, padrao_semelhante: null, estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "27500", valor_medio_venda: "28000", limite_inferior: "21000", limite_superior: "35000", valor_considerado: "30000", nome: null, cpf: null, endereco: "Pasto das Eguas", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Fábricas", sub_bairro: "Vila João Lombard", area: "143", area_construida: "89.52", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "39", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "F - Entre reparos simples e importantes", valor_benfeitoria: "83264.98227", valor_medio_lote: "64715.508", valor_medio_venda: "148000", limite_inferior: "111000", limite_superior: "185000", valor_considerado: "47129.47", nome: null, cpf: null, endereco: "Rua Tocantins, 117A", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Bairro Guarda-Mor", sub_bairro: null, area: "58.68", area_construida: "65.72", vida_util: "Apartamentos, Kitnets, Garagens, Const. Rurais – 60 anos", idade_aparente: "45", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "F - Entre reparos simples e importantes", valor_benfeitoria: "38931.63778", valor_medio_lote: "21325.4856", valor_medio_venda: "60000", limite_inferior: "45000", limite_superior: "75000", valor_considerado: "39500", nome: null, cpf: null, endereco: "Rua Delegado José Lima, 854", telefone: null},
      {regiao: "Tiradentes", bairro: "Sérgio Barbosa", sub_bairro: null, area: "361.5", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "48633.318", valor_medio_venda: "49000", limite_inferior: "36000", limite_superior: "62000", valor_considerado: "100000", nome: null, cpf: null, endereco: "Rua D, Lote 18, Quadra 9", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Jardim_Central", sub_bairro: "Res. Novo Horizonte", area: "288.2", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "86197.1616", valor_medio_venda: "86000", limite_inferior: "64000", limite_superior: "108000", valor_considerado: "85000", nome: null, cpf: null, endereco: "Rua Alnilam, Lote 14, Quadra 23", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Bonfim", sub_bairro: ".Geral - Bonfim", area: "256.5", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "127318.392", valor_medio_venda: "127000", limite_inferior: "95000", limite_superior: "159000", valor_considerado: "140000", nome: null, cpf: null, endereco: "Rua Maria Rosário de Carvalho, Lote 27, Quadra 3", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Tejuco", sub_bairro: "São José Operário", area: "1200", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "246834", valor_medio_venda: "247000", limite_inferior: "185000", limite_superior: "309000", valor_considerado: "45000", nome: null, cpf: null, endereco: "Rua Itapeva, Lote 17, 18, 19,20, Quadra 5", telefone: null},
      {regiao: "Rural", bairro: "Rural_Tiradentes", sub_bairro: "Tiradentes_Silvicultura ou Pastagem Natural", area: "5", area_construida: null, vida_util: null, idade_aparente: null, padrao_semelhante: null, estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "237671.25", valor_medio_venda: "238000", limite_inferior: "178000", limite_superior: "298000", valor_considerado: "150000", nome: null, cpf: null, endereco: "Pasto das Éguas", telefone: null},
      {regiao: "Rural", bairro: "Rural_São_João_Del_Rei", sub_bairro: "SJRD_Silvicultura ou Pastagem Natural", area: "8", area_construida: null, vida_util: null, idade_aparente: null, padrao_semelhante: null, estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "73600", valor_medio_venda: "74000", limite_inferior: "55000", limite_superior: "93000", valor_considerado: "60000", nome: null, cpf: null, endereco: "Pasto da Eguas", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Matosinhos", sub_bairro: "Água Limpa", area: "276.47", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "124650.3701", valor_medio_venda: "125000", limite_inferior: "93000", limite_superior: "157000", valor_considerado: "126363.01", nome: null, cpf: null, endereco: "Rua Projetada 04, Lote 1, Quadra E", telefone: null},
      {regiao: "Rural", bairro: "Rural_São_Tiago", sub_bairro: "São Tiago_Silvicultura ou Pastagem Natural", area: "30.255", area_construida: null, vida_util: null, idade_aparente: null, padrao_semelhante: null, estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "199683", valor_medio_venda: "200000", limite_inferior: "150000", limite_superior: "250000", valor_considerado: "600000", nome: null, cpf: null, endereco: "Cruz das Almas, Córrego Fundo", telefone: null},
      {regiao: "Santa_Cruz_de_Minas", bairro: "Centro Santa Cruz de Minas", sub_bairro: null, area: "200", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "90793.8", valor_medio_venda: "91000", limite_inferior: "68000", limite_superior: "114000", valor_considerado: "50000", nome: null, cpf: null, endereco: "Rua Conego Oswaldo Lustosa, 348 ", telefone: null},
      {regiao: "Nazareno", bairro: "Res. Eldorado", sub_bairro: null, area: "401.87", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "75953.43", valor_medio_venda: "76000", limite_inferior: "57000", limite_superior: "95000", valor_considerado: "90000", nome: null, cpf: null, endereco: "Rua Projetada Três", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Fábricas", sub_bairro: "Vila João Lombard", area: "143", area_construida: "89.52", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "39", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "F - Entre reparos simples e importantes", valor_benfeitoria: "83264.98227", valor_medio_lote: "64715.508", valor_medio_venda: "148000", limite_inferior: "111000", limite_superior: "185000", valor_considerado: "47129.47", nome: null, cpf: null, endereco: "Rua Tocantins, 117A", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Centro", sub_bairro: "Apartamento - Localização Boa", area: "20.06", area_construida: "42.61", vida_util: "Lojas, Escritórios, Galpões, Bancos – 70 anos", idade_aparente: "2", padrao_semelhante: "CSL8N - Edifício comercial, com lojas e salas", estado_conservacao: "C - Regular", valor_benfeitoria: "106806.7781", valor_medio_lote: "73122.13026", valor_medio_venda: "155320.7363", limite_inferior: "116000", limite_superior: "195000", valor_considerado: "241000", nome: null, cpf: null, endereco: "Rua Arthur Bernardes, 15", telefone: null},
      {regiao: "São_João_Del_Rei", bairro: "Senhor_dos_Montes", sub_bairro: ".Geral - Sr. Dos Montes", area: "620", area_construida: "78", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "72", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "G - Reparos importantes", valor_benfeitoria: "0", valor_medio_lote: "117180", valor_medio_venda: "117000", limite_inferior: "87000", limite_superior: "147000", valor_considerado: "120000", nome: null, cpf: null, endereco: "Rua Sebastião dos Passos Melo, 74", telefone: null},
      {regiao: "Lagoa_Dourada", bairro: "Bom Jesus", sub_bairro: null, area: "350.52", area_construida: "69.67", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "8", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "F - Entre reparos simples e importantes", valor_benfeitoria: "114850.7332", valor_medio_lote: "44905.1172", valor_medio_venda: "160000", limite_inferior: "120000", limite_superior: "200000", valor_considerado: "100000", nome: null, cpf: null, endereco: "Praça Cônego Agostinho José de Resende, 312", telefone: null},
      {regiao: "Ritápolis", bairro: "Fátima", sub_bairro: null, area: "290", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "41707.8", valor_medio_venda: "42000", limite_inferior: "31000", limite_superior: "53000", valor_considerado: "10000", nome: null, cpf: null, endereco: "Rua Eurico Dutra", telefone: null},
      {regiao: "Distritos", bairro: "Rio_das_Mortes", sub_bairro: "Rio das Mortes < 1000 m2", area: "63.02", area_construida: "65.61", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "40", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "G - Reparos importantes", valor_benfeitoria: "43263.13537", valor_medio_lote: "3466.1", valor_medio_venda: "47000", limite_inferior: "35000", limite_superior: "59000", valor_considerado: "25000", nome: null, cpf: null, endereco: "Rua Vereador Enesto da Silva Braga, 221", telefone: null},
      {regiao: "Tiradentes", bairro: "Cuiabá", sub_bairro: null, area: "6389.5", area_construida: null, vida_util: "Lote", idade_aparente: null, padrao_semelhante: "Lote", estado_conservacao: null, valor_benfeitoria: "0", valor_medio_lote: "1732295.682", valor_medio_venda: "1732000", limite_inferior: "1299000", limite_superior: "2165000", valor_considerado: "1000000", nome: null, cpf: null, endereco: "Rua Vereador José Inácio Veloso ", telefone: null},
      {regiao: "Ritápolis", bairro: "Cássia", sub_bairro: null, area: "4385.63", area_construida: "67.85", vida_util: "Casa de Alvenaria – 65 anos", idade_aparente: "1", padrao_semelhante: "R1B - Residência unifamiliar padrão baixo", estado_conservacao: "B - Entre novo e regular", valor_benfeitoria: "179961.0408", valor_medio_lote: "630741.3066", valor_medio_venda: "811000", limite_inferior: "608000", limite_superior: "1014000", valor_considerado: "300000", nome: null, cpf: null, endereco: "Rua Amazonas, 59", telefone: null}
    ];

    setImporting(true);

    try {
      const response = await importImpData({ data: historicoData });
      
      if (response.data?.success) {
        toast({
          title: "Sucesso!",
          description: `${response.data.inserted} avaliações importadas com sucesso.`,
        });
        
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        throw new Error(response.data?.error || "Erro ao importar");
      }
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        title: "Erro",
        description: "Erro ao importar dados históricos.",
        variant: "destructive"
      });
    }

    setImporting(false);
  };

  return (
    <Button
      onClick={handleImport}
      disabled={importing}
      variant="outline"
      className="gap-2"
    >
      {importing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Importando...
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          Importar Histórico (Teste)
        </>
      )}
    </Button>
  );
}