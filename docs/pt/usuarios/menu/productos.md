# Produtos

## O que é um produto?

Um produto é o que seus clientes veem e podem pedir: tem nome, preço, descrição e foto. É o que aparece no seu cardápio.

**Exemplos:** Pizza Margarita, Hambúrguer Clássico, Limonada Natural.

---

## Antes de criar um produto

Cada produto pode ser vinculado a uma receita base. A receita informa a WARO quais itens de estoque esse produto consome, permitindo calcular custos e controlar inventário.

Se quer esse controle, crie a receita primeiro. Se por agora só precisa registrar o produto, pode criá-lo sem receita e adicionar depois.

**Ordem recomendada:** receita → produto.

---

## Como criar um produto

Vá em **Cardápio → Produtos → Novo produto**.

O formulário tem 3 passos:

### Passo 1 — Informações gerais

| Campo | O que preencher | Obrigatório |
|-------|-----------------|:-----------:|
| Nome do produto | O nome que os clientes verão. Ex.: `Pizza Margarita` | Sim |
| Descrição | Descrição curta do prato | Não |
| Categoria | Grupo (Entradas, Pratos principais, Bebidas...) | Sim |
| Preço de venda | Preço em pesos colombianos | Sim |
| Custo real (sistema) | Calculado pela WARO a partir da receita e compras de itens de estoque (somente leitura) | — |
| Meu custo do prato | Custo operacional que você define para margens e relatórios; o sistema não o altera | Não |
| Tempo de preparo | Quantos minutos para preparar | Não |
| Disponível | Se está ativo no cardápio | — |
| Disponível para delivery | Se aparece em pedidos online (delivery / retirada) | — |
| Pedido na mesa (QR) | Se aparece no menu QR das mesas (só se o módulo QR está ativo em Operações) | — |

> Se desativa **Disponível**, o produto não aparece em nenhum menu até reativar.
>
> **Pedido na mesa (QR)** é independente do delivery: um produto pode estar no QR da mesa sem estar no delivery, e vice-versa.

### Passo 2 — Receita / Itens de estoque

Aqui vincula o produto a uma ou mais receitas base já criadas.

- Clique em **+ Adicionar Receita Base**
- Busque e selecione a receita
- Se o produto ainda não tem receita, pode deixar este passo vazio e continuar

### Passo 3 — Revisão e confirmação

Revise o resumo: nome, categoria e status. Se tudo estiver certo, clique em **Criar produto**.

---

## Custo real vs meu custo do prato

WARO gerencia dois custos por produto:

| Conceito | Quem define | Para que serve |
|----------|-------------|----------------|
| **Custo real (sistema)** | WARO, ao salvar o produto com receita | Reflete itens de estoque e preços de compra; atualiza se mudam compras ou receita |
| **Meu custo do prato** | Você, opcional | Sua referência operacional (mão de obra, perda, fornecedor diferente, etc.) |

Na listagem você vê **Margem real** (preço vs custo do sistema) e **Margem operacional** (preço vs seu custo), quando definiu "Meu custo".

Se os dois custos diferem muito, a linha fica em âmbar para revisar se convém ajustar seu custo percebido ou a receita.

---

## O produto aparece no menu online imediatamente?

- **Delivery / pedidos online:** sim, se **Disponível para delivery** está marcado.
- **QR na mesa:** sim, se **Pedido na mesa (QR)** está marcado e o negócio tem o módulo QR ativo em **Operações → Mesas**.

Se não marca nenhuma das duas, o produto existe no sistema mas não é visível nesses canais.

---

## Perguntas frequentes

**Posso mudar o preço depois?**
Sim. Vá em **Cardápio → Produtos**, abra o produto e edite.

**O que acontece se não atribuo uma receita?**
O produto funciona para vendas, mas WARO não calculará o custo nem descontará itens de estoque do inventário automaticamente.

**Posso ter o mesmo produto em várias categorias?**
Não. Cada produto pertence a uma só categoria. Se precisa aparecer em mais de um lugar, considere variantes ou modificadores.

**Como adiciono uma foto ao produto?**
Na edição do produto, após criar.

**Por que um produto não aparece no menu QR da mesa?**
Revise **Pedido na mesa (QR)** no produto e que o módulo está ativo em **Operações → Mesas**. Ver [Mesas](../../operaciones/mesas#pedido-por-qr-en-mesa).
