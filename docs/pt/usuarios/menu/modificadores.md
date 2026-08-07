# Modificadores

## O que é um modificador?

Um modificador é uma opção adicional que o cliente pode escolher ao pedir um produto. As opções se agrupam em um **grupo de modificadores**.

**Exemplos:**
- Grupo "Tamanho" → opções: Individual, Médio, Grande
- Grupo "Molho" → opções: BBQ, Rosé, Picante
- Grupo "Sem..." → opções: Sem cebola, Sem tomate, Sem alface
- Grupo "Extras" → opções: Queijo extra (+$2.000), Bacon (+$3.000)

Cada grupo é atribuído a um ou mais produtos. Quando o cliente pede esse produto, vê as opções do grupo para personalizar o pedido.

---

## Conceitos-chave antes de começar

**Grupo:** o nome da categoria de opções (ex.: "Tamanho").

**Modificadores:** cada opção dentro do grupo (ex.: "Individual", "Médio", "Grande"). Cada um pode ter preço adicional ou ser grátis.

**Obrigatório vs. opcional:** se o grupo é obrigatório, o cliente não pode pedir o produto sem escolher ao menos uma opção. Se opcional, pode ignorar.

**Seleção mínima e máxima:** quantas opções o cliente pode/deve escolher.
- Mín 0, Máx 1 → o cliente pode escolher uma opção ou nenhuma
- Mín 1, Máx 1 → o cliente deve escolher exatamente uma opção
- Mín 0, Máx 3 → o cliente pode escolher até 3 opções (como extras)

---

## Como criar um grupo de modificadores

Vá em **Cardápio → Modificadores → Novo grupo**.

O formulário tem 3 passos:

### Passo 1 — Informações do grupo

| Campo | O que preencher | Obrigatório |
|-------|-----------------|:-----------:|
| Produtos | Os produtos aos quais este grupo se aplica | Sim |
| Nome do grupo | O que o cliente verá. Ex.: `Tamanho`, `Extras`, `Molho` | Sim |
| Seleção mínima | Quantas opções o cliente deve escolher no mínimo | Sim |
| Seleção máxima | Quantas opções o cliente pode escolher no máximo | Sim |
| Ordem de exibição | Se há vários grupos, qual aparece primeiro (menor número = primeiro) | Não |
| É obrigatório | Se o cliente deve escolher antes de pedir | — |

> **Dica:** Para tamanhos onde o cliente deve escolher um, use Mín: 1 e Máx: 1 e marque como obrigatório.

### Passo 2 — Opções do grupo (modificadores)

Aqui você adiciona cada opção disponível. Para cada uma define:

| Campo | O que preencher |
|-------|-----------------|
| **Tipo** | Como o inventário é descontado ao vender (ver tabela abaixo) |
| Nome | Nome da opção. Ex.: `Grande`, `BBQ`, `Queijo extra` |
| Preço adicional | Quanto soma ao preço base. Se grátis, use 0. |
| Máx / Ordem | Quantidade máxima por linha e ordem na tela |

Clique em **+ Adicionar Modificador** para adicionar mais opções.

#### Tipos de opção (composição e inventário)

| Tipo na tela | Quando usar | O que configura | Inventário ao vender |
|--------------|-------------|-----------------|---------------------|
| **Item de estoque** | Insumo do catálogo sem produto de menu vinculado (matéria-prima, insumo, serviço) | Item de estoque + quantidade + unidade; também pode **adicionar opções por categoria** | Desconta esse item × quantidade do modificador × quantidade do produto |
| **Revenda** | Produto de revenda (vinculado 1:1 a um item de estoque) | Produto de revenda + quantidade + unidade | Desconta o item de estoque vinculado ao produto |
| **Receita base** | Várias matérias-primas conforme preparação definida | Receita base + multiplicador (quantidade × receita) | Desconta **todos** os itens da receita, escalados pelo multiplicador |
| **Produto do cardápio** | A opção consome a composição de outro produto do menu (prato com receita, não revenda) | Produto do cardápio + multiplicador | Desconta a receita/composição desse produto (como uma porção) |
| **Somente preço** | Extra sem impacto em estoque (ex.: embalagem, serviço, "sem gelo") | Só nome e preço | **Não** move inventário; só soma ao total da venda |

> **Revenda vs item de estoque:** ambos descontam inventário via **item de estoque**. Na revenda você escolhe o **produto do cardápio** e WARO resolve o item vinculado (1 und). No item de estoque você escolhe direto do catálogo (sem produto associado).

Se um item de estoque não aparece na busca, use **+ Criar item de estoque** no painel lateral (Nome, Tipo de medida e Categoria obrigatórios).

→ [Ver mais sobre itens de estoque próprios](/docs/usuarios/abastecimiento#catálogo-de-bodega)

### Passo 3 — Revisão

Revise o resumo e clique em **Criar grupo**.

---

## Quando o modificador soma ao preço?

Quando o cliente escolhe uma opção com preço adicional, esse valor é somado automaticamente ao preço do produto no pagamento (inclui POS, mesas e pedidos online).

---

## Inventário e custos ao vender

- O **preço de venda** do modificador sempre fica na ordem (o que você cobrou).
- O **desconto de estoque** depende do **tipo** da opção: item de estoque, revenda, receita base ou produto do cardápio descontam conforme a composição; **Somente preço** não desconta nada.
- Se edita uma venda e **remove** um modificador, WARO devolve ao inventário os insumos descontados por essa opção.
- Custos de food cost / fechamento contábil usam o detalhe de insumos explodidos por cada modificador (não só um item quando a opção é receita base ou produto do cardápio).

---

## Perguntas frequentes

**Posso atribuir um grupo a vários produtos?**
Sim. Ao criar o grupo, selecione todos os produtos que precisam dele.

**Posso editar as opções depois de criar o grupo?**
Sim. Vá em **Cardápio → Modificadores**, abra o grupo e edite.

**O que acontece se não adiciono opções no passo 2?**
O grupo é criado vazio. Os clientes não verão nada para selecionar. Adicione depois na edição.

**O cliente pode pedir sem escolher modificador obrigatório?**
Não. Se o grupo é obrigatório, o botão de adicionar ao carrinho não ativa até o cliente escolher.

**Posso misturar tipos no mesmo grupo?**
Sim. Ex.: tamanhos com **Somente preço**, extras com **Item de estoque** ou **Revenda**, e combo com **Receita base**.

**O cliente escolhe o tipo de opção?**
Não. O tipo só é configurado por você na administração; no caixa o cliente vê nome e preço.
