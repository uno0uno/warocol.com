# Receitas

## O que é uma receita?

Uma receita é uma **composição reutilizável de itens de estoque** que você pode atribuir a um ou vários produtos. Serve para evitar repetir a mesma lista de itens de estoque em cada produto.

**Exemplo prático:** Você tem um molho da casa usado em 5 pratos diferentes. Em vez de adicionar os mesmos 6 itens de estoque em cada produto, cria uma receita "Molho da Casa" com esses itens e vincula aos 5 produtos. Se altera a receita, a mudança vale para todos os produtos que a usam.

As receitas não são vistas pelos clientes. São internas: controlam custos e descontam itens de estoque do inventário automaticamente.

---

## Quando usar receitas

As receitas são **opcionais**. Um produto pode ter:

| Configuração | Quando usar |
|--------------|-------------|
| Apenas itens de estoque diretos | O produto é simples e único — ninguém mais usa esses itens nessa combinação |
| Apenas receitas | A preparação é compartilhada com outros produtos |
| Receitas + itens de estoque adicionais | Você tem uma base comum (receita) mais itens próprios do prato |

> Se o produto é único e simples, adicione os itens de estoque diretamente sem criar receita. As receitas valem quando são **reutilizadas**.

---

## Como criar uma receita

Vá em **Cardápio → Receitas → Nova Receita Base**.

O formulário tem 3 passos:

### Passo 1 — Informações gerais

| Campo | O que preencher |
|-------|-----------------|
| Nome | O nome interno da receita. Ex.: `Molho da Casa`, `Base de Carne`, `Massa de Pizza` |
| Status | Ativa ou Inativa. Deixe ativa se já está em uso. |

> O nome é de uso interno. Use nomes que descrevam a preparação, não o produto final.

### Passo 2 — Itens de estoque

Aqui você adiciona cada item de estoque com sua quantidade.

- Busque o item por nome no campo de busca
- Digite a quantidade e a unidade (gramas, mililitros, unidades, etc.)
- Repita para cada item

**Se o item de estoque não existe:** na busca aparece a opção **+ Criar item de estoque**. Clique para abrir em um painel lateral sem sair do formulário.

Ao criar o item de estoque daqui, complete:

| Campo | Obrigatório | Notas |
|-------|:-----------:|-------|
| Nome | Sim | Ex.: `Carne Angus especial` |
| Tipo de medida | Sim | Peso (gr/kg), Volume (ml/lt) ou Peça (und). Definido só na criação — não muda depois. |
| Categoria | Sim | Ex.: `Carnes`, `Molhos`, `Lácteos` |

As unidades de compra são geradas automaticamente conforme o tipo de medida. Ao salvar o item, ele fica disponível imediatamente para selecionar na receita.

→ [Ver mais sobre itens de estoque próprios](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

### Passo 3 — Revisão e confirmação

Revise o resumo: nome, número de itens de estoque e status. Se tudo estiver certo, clique em **Criar receita**.

---

## Posso editar uma receita depois?

Sim. Vá em **Cardápio → Receitas**, busque a receita e clique nela para editar. A mudança vale para todos os produtos que a usam daqui para frente — pedidos já registrados não são afetados.

---

## Perguntas frequentes

**Uma receita é obrigatória para criar um produto?**
Não. Você pode criar um produto com itens de estoque diretos, sem qualquer receita.

**Um produto pode ter várias receitas?**
Sim. Você pode atribuir mais de uma receita ao mesmo produto e também adicionar itens de estoque adicionais fora dessas receitas.

**Posso ter duas receitas com o mesmo nome?**
Sim, o sistema permite, mas não é recomendado. Use nomes descritivos para não se confundir.

**O que acontece se eu mudo os itens de estoque de uma receita?**
A mudança vale daqui para frente para todos os produtos que usam essa receita. Vendas já registradas não mudam.
