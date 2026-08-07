# Histórico de gorjetas

Em **Vendas → Gorjetas** você consulta todos os pedidos que cobraram gorjeta, com suas métricas e filtros próprios.

## Como acessar

Menu lateral → **Vendas** → aba **Gorjetas** (`/ventas/propinas`).

> Se as gorjetas não estiverem ativadas em **Operações → Gorjetas**, esta tela mostra um estado vazio com um botão para abrir a configuração.

---

## Métricas do período

Três cartões na parte superior, calculados sobre o intervalo de datas e filtros ativos:

| Métrica | O que mostra |
|---------|--------------|
| **Total de gorjetas** | Soma das gorjetas cobradas no período |
| **Média sobre a venda** | Percentual médio de gorjeta em relação ao subtotal dos pedidos com gorjeta |
| **Pedidos com gorjeta** | Quantos pedidos registraram gorjeta |

---

## Filtros

| Filtro | Opções |
|--------|--------|
| Busca | Número do pedido |
| Período | Hoje · Ontem · Última semana · 15 dias · 30 dias · 90 dias ou personalizado |
| Garçom | Filtra pelo garçom atribuído |
| Canal | POS · Mesa · Online |
| Método de pagamento | Selecione um grupo ou um método específico |

Use **Limpar filtros** para voltar ao estado inicial (últimos 30 dias, sem restrições).

---

## Tabela de pedidos com gorjeta

Cada linha mostra:

- **Data** do pedido
- **Pedido** — número clicável que abre o detalhe em `/ventas/{id}`
- **Canal** — badge com POS, Mesa, Balcão ou Online
- **Subtotal** da venda
- **Gorjeta** cobrada
- **%** sobre o subtotal
- **Garçom** — clique para refiltrar a tabela por esse garçom
- **Método de pagamento**

Você pode ordenar por data, pedido, subtotal, gorjeta ou método de pagamento. A tabela pagina de 25 em 25.

---

## Exportar

O botão **Exportar** envia por e-mail um relatório com todos os pedidos com gorjeta do período e filtros ativos. O sistema mostra um modal quando o envio é processado.

---

## Chegar pré-filtrado de outras seções

- Em **Análise → Vendas**, o cartão "Gorjetas do período" abre esta tela com o intervalo de datas do dashboard já aplicado.
- Em **Equipe → Membros → Ver perfil**, as gorjetas desse garçom abrem o histórico pré-filtrado pelo nome dele.

---

## Configurar gorjetas?

A configuração (ativar/desativar, percentuais sugeridos, pré-seleção) fica em **Operações → Gorjetas**. Esta tela é somente leitura: um histórico para análise e conciliação.
