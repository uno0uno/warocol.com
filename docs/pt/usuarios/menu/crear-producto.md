# Criar um produto

## O que é um produto?

Um produto é o que seus clientes veem e podem pedir: tem nome, preço, descrição e categoria. É o que aparece no seu cardápio.

**Exemplos:** Pizza Margarita, Hambúrguer Clássico, Limonada Natural.

---

## Como funciona a composição de um produto

Cada produto pode ter itens de estoque atribuídos de três formas — você pode usar qualquer uma ou combinar:

| Opção | Quando usar |
|-------|-------------|
| **Apenas itens de estoque diretos** | O produto é único e não compartilha a preparação com outros pratos |
| **Apenas receitas** | A preparação é uma receita já criada usada em vários produtos |
| **Receitas + itens de estoque adicionais** | Você tem uma base comum (receita) mais itens próprios deste prato |

> **Com receita** no assistente: WARO desconta inventário conforme a receita ao vender.
>
> **Venda direta** (revenda): vendida por peça (`und`); o sistema cria o insumo de stock e a equivalência em gr ou ml.

**Quando criar uma receita primeiro?** Só quando essa preparação é reutilizada em vários produtos. Se o prato é único, adicione os itens de estoque diretamente ao produto. → [ver guia de receitas](./recetas.md)

---

## Como criar um produto

Vá em **Cardápio → Produtos → Novo produto**.

O assistente tem **4 passos** se escolhe **Com receita**, ou **3 passos** se escolhe **Venda direta** (sem passo de receita).

### Imposto do produto

Se o negócio usa **impostos comerciais** (linhas em Faturamento), o produto **herda** o imposto da **categoria do cardápio**. Pode deixar assim, marcar **isento** ou escolher **outra linha**. Esse override prevalece sobre o mapa da categoria.

Em Colômbia com matriz fiscal por colunas, você ainda escolhe Alimento/Bebida, Licor ou Isento.

### Passo 1 — Tipo de produto

Escolha como é preparado ou vendido:

| Opção | Significado |
|-------|-------------|
| **Com receita** | Cozinha · itens de estoque e receitas base; cada venda desconta inventário |
| **Venda direta** | Revenda · peça (`und`) com equivalência em gr ou ml |

### Passo 2 — Informações gerais

| Campo | O que preencher | Obrigatório |
|-------|-----------------|:-----------:|
| Nome do produto | O nome que os clientes verão. Ex.: `Pizza Margarita` | Sim |
| Descrição | Descrição curta do prato | Não |
| Categoria | Grupo (Entradas, Pratos principais, Bebidas...) | Sim |
| Preço de venda | Preço em pesos colombianos | Sim |
| Tempo de preparo | Quantos minutos leva (só **Com receita**) | Não |
| Equivalência gr/ml | Peso ou volume por unidade vendida (só **Venda direta**) | Sim |
| Disponível | Se está ativo no cardápio | — |
| Disponível para delivery | Se aparece em pedidos online (delivery / retirada) | — |
| Pedido na mesa (QR) | Se aparece no menu QR das mesas | — |

> Se desativa **Disponível**, o produto não aparece em nenhum menu até reativar.
>
> **Pedido na mesa (QR)** é independente do delivery.

### Passo 3 — Receita (só Com receita)

Aqui define de que o produto é feito:

**Adicionar receitas** — clique em **+ Adicionar Receita Base** e busque uma receita já criada.

**Adicionar itens de estoque diretos** — adicione itens um a um com a quantidade.

**Se o item de estoque não existe:** na busca aparece **+ Criar item de estoque** (painel lateral sem sair do formulário).

→ [Ver mais sobre itens de estoque próprios](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

Pode deixar receitas e itens vazios ao criar; pode completar depois, mas custo e desconto de inventário serão mais precisos com a receita definida.

### Passo 4 — Revisão e confirmação

Revise o resumo: nome, categoria, receita ou dados de revenda e status. Se tudo estiver certo, clique em **Criar produto**.

---

## O produto aparece no menu online imediatamente?

Sim, se **Disponível para delivery** estiver marcado. Se não marcar, o produto existe no sistema mas não é visível para clientes online.

---

## Perguntas frequentes

**Posso mudar o preço depois?**
Sim. Vá em **Cardápio → Produtos**, abra o produto e edite.

**O que acontece se não atribuo receitas nem itens de estoque (Com receita)?**
O produto funciona para vendas, mas WARO não calculará o custo nem descontará itens do inventário automaticamente até definir a receita.

**Posso atribuir várias receitas ao mesmo produto?**
Sim. Pode combinar várias receitas e também adicionar itens de estoque adicionais.

**Como adiciono modificadores (tamanhos, extras, molhos)?**
Os modificadores são criados separadamente e atribuídos a um ou mais produtos. Ver [guia de modificadores](./modificadores.md).

**Como adiciono uma foto ao produto?**
No passo de informações gerais, ou na edição do produto após criar.
