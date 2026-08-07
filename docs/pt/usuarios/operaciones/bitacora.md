# Registro de atividades de operações

O **Registro de Atividades** é o registro de auditoria do POS: quem fez o quê, em qual canal (mesa, bar ou balcão), quando e — quando aplicável — com qual motivo. Serve para que donos, administradores e supervisores revisem exclusões de produtos, esvaziamentos de tab ou carrinho e anulações de pagamentos parciais.

## Como acessar

Menu lateral → **Operações → Registro de Atividades**.

Você verá uma lista paginada de eventos. No topo pode filtrar por datas, canal, tipo de ação e buscar por nome de produto. Clique em uma linha para ver o detalhe técnico do evento (útil para suporte).

> **Permissões:** apenas usuários com acesso ao módulo **Operações** podem abrir o Registro de Atividades (tipicamente dono, administrador e supervisor). A equipe de caixa sem esse módulo não verá a aba nem poderá consultar o histórico.

---

## O que o Registro registra (POS)

Cada linha é um evento automático gerado quando a equipe usa o POS após a função estar ativa no negócio.

| Ação no Registro | O que significa |
|------------------|-----------------|
| **Produto adicionado à mesa** | Um item foi adicionado ao tab de uma mesa ou bar |
| **Produto removido da mesa** | Um item foi removido do tab (mesa/bar) |
| **Quantidade modificada** | A quantidade de um item no tab foi alterada |
| **Mesa esvaziada** | O tab de uma sessão de mesa ou bar foi esvaziado |
| **Linha removida do carrinho** | Um produto foi removido do carrinho no balcão ou bar |
| **Carrinho esvaziado** | O carrinho completo foi esvaziado |
| **Pagamento cancelado** | Um pagamento parcial já registrado no checkout foi anulado |

Em cada evento você verá, entre outros dados:

- **Quando** — data e hora
- **Usuário** — quem realizou a ação no sistema
- **Canal** — Mesa, Bar ou Balcão
- **Resumo** — produto e quantidade, ou dados do pagamento anulado
- **Mesa** — nome da mesa quando aplicável
- **Motivo** — texto capturado no POS (ver políticas abaixo)
- **Pedido** — link à venda quando existe

---

## O que não registra

| Situação | Por que não aparece |
|----------|---------------------|
| Produtos no carrinho **antes de enviá-los ao tab** ou antes do carrinho sincronizar com o servidor | Só são auditadas ações que chegam ao servidor |
| Ações **anteriores à implantação** do registro no negócio | O registro é desde a ativação em produção, não preenche o passado |
| Anulação de uma **venda completa** em Vendas → Pedidos | É outro fluxo; não é o mesmo que anular um pagamento parcial no checkout |
| Alterações de preço, descontos ou configuração do cardápio | Fora do alcance do MVP do POS |

Se a lista está vazia logo após ativar a função, é normal: os eventos aparecem quando a equipe começa a operar com a versão que inclui o registro.

---

## Como filtrar

| Filtro | Para que serve |
|--------|----------------|
| **Intervalo de datas** | Limita o período (calendário com atalhos como Hoje, Última semana, etc.) |
| **Canal** | Só Mesa, só Bar, só Balcão, ou todos |
| **Ação** | Um tipo específico (ex. só "Pagamento cancelado" ou "Produto removido da mesa") |
| **Buscar produto** | Texto livre no resumo (nome do produto no payload) |

Use **Limpar** para remover todos os filtros. A lista atualiza ao mudar filtros ou ao usar o botão de atualizar do cabeçalho do painel.

---

## Políticas de motivo

### Produto já enviado à cozinha (mesa ou bar)

Se as **comandas** estão ativas e o produto **já saiu para a cozinha** (já não está em status "novo"), ao removê-lo do tab o POS pede um **motivo obrigatório** antes de confirmar. Esse texto fica na coluna **Motivo** do Registro e a cozinha continua vendo a linha anulada no KDS.

Se o produto **ainda não foi enviado à cozinha**, você pode removê-lo sem escrever motivo.

### Anulação de um pagamento parcial

No **checkout**, ao remover um pagamento já registrado (ícone de lixeira no cobro parcial), você pode escrever um motivo opcional. Se deixar em branco, o sistema registra **"Sem motivo"** no Registro.

> Se o pagamento foi em **dinheiro**, o POS lembra de devolver o dinheiro fisicamente ao cliente antes de confirmar. Ver [Cobro parcial](../pos#cobro-parcial-split) na guia do POS.

---

## Detalhe de um evento

Clique em qualquer linha (ou cartão no celular) para abrir o detalhe. Ali você verá o **motivo** completo, o link ao **pedido** se existe, e o **payload** em formato técnico (JSON) com todos os dados que o sistema guardou — útil se o suporte precisa investigar um caso.

---

## Relação com outras telas

| Você precisa… | Vá a… |
|--------------|--------|
| Configurar mesas, comandas ou gorjetas | [Operações](../operaciones) |
| Como anular um pagamento ou remover um produto no POS | [Processar uma venda no POS](../pos) |
| Histórico de vendas e anulação de pedido completo | [Vendas](../ventas) |
| Números de faturação DIAN descartados | [Faturação — Registro de números queimados](../facturacion#bitácora-de-números-quemados) (é um registro distinto) |

---

## Perguntas frequentes — Registro de Atividades

**O Registro substitui câmeras ou arqueo de caixa?**
Não. É um registro de ações sensíveis no POS, não um vídeo nem um fechamento de caixa.

**O caixa pode ver o motivo que o gerente colocou?**
Só se o cargo tem acesso a **Operações**. A maioria dos caixas não vê o Registro.

**Posso exportar para Excel?**
No MVP não há exportação da tela; use filtros e paginação para revisar por período.

**Por que não vejo eventos de ontem se já usávamos WARO?**
O registro começou quando o negócio ficou com a versão que inclui o registro; não reconstrói o histórico anterior.

**Remover um produto do carrinho no balcão sempre fica registrado?**
Sim, quando o carrinho está sincronizado com o servidor. Alterações só no carrinho local, antes do sistema guardar, não geram evento.
