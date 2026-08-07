# Mesas

A gestão de mesas permite organizar o salão do restaurante diretamente no POS. Quando ativa, o ponto de venda exibe o mapa do salão e cada mesa tem sua própria sessão de pedido.

## Como acessar

Menu lateral → **Operações → Mesas**. Daqui você pode:

- Ativar ou desativar o módulo de mesas para o POS
- Ativar **pedido por QR na mesa** e gerenciar o link QR de cada mesa
- Ver a lista de mesas configuradas com o status atual e, se aplicável, o garçom atribuído
- Criar, editar, desativar e reativar mesas

> A etiqueta do módulo é configurável. Alguns negócios chamam "Cubículos" (salões), "Quartos" (hotéis), "Pistas" (eventos), etc. A configuração é feita em **Operações → Personalizar**. Esta guia usa "Mesa" como termo genérico.

---

## Ativar o módulo de mesas

Na parte superior da página você verá o toggle **Gestão de mesas**.

- **Ativado** — o POS exibe o mapa do salão ao abrir e cada mesa tem sua própria sessão de pedido.
- **Desativado** — o POS opera apenas no modo balcão.

> A alteração é refletida no POS imediatamente. Se você tem uma caixa aberta atendendo, recarregue a aba do POS para ver a mudança.

---

## Configurar as mesas

### Criar uma mesa

Clique em **+ Nova mesa**. Preencha:

| Campo | Descrição |
|-------|-----------|
| Nome | Identificador da mesa (ex. "Mesa 1", "Terraço A") |
| Capacidade | Número de pessoas que pode atender (opcional) |

### Editar uma mesa

Clique no ícone de edição ao lado da mesa que deseja modificar. Você pode alterar o nome e a capacidade.

### Desativar uma mesa

Clique no ícone de desativar. WARO pedirá confirmação antes de prosseguir.

Você não pode desativar uma mesa com sessão aberta. Primeiro feche o pedido no POS.

### Reativar uma mesa desativada

Mesas desativadas não são eliminadas: ficam em uma lista separada caso precise delas depois. Para reativar:

1. Filtre a lista por **Desativadas** (ou expanda a seção "Mesas inativas").
2. Toque o ícone de reativar na mesa correspondente.
3. Confirme — a mesa volta a aparecer no mapa do salão imediatamente.

---

## Status das mesas

| Status | Significado |
|--------|-------------|
| **Livre** | Sem pedido ativo, disponível para atender |
| **Ocupada** | Tem um pedido em andamento |
| **Solicitando conta** | O cliente pediu para fechar a conta |

---

## Coluna Garçom (opcional)

Se o negócio tem **atribuição de garçons** ativa (em **Operações → Gorjetas**), aparece uma coluna extra que mostra o garçom efetivo da sessão atual de cada mesa. Isso facilita saber quem está atendendo cada mesa antes de cobrar.

---

## Pedido por QR na mesa

Permite que os clientes peçam pelo celular escaneando um código na mesa. O pedido **não entra no POS nem na cozinha** até que a equipe **aceite** em **Despacho → Pedidos na mesa (QR)**.

### Requisitos

1. **Gestão de mesas** ativa (toggle superior desta página).
2. **Pedido por QR na mesa** ativo (segundo toggle no bloco de módulos).
3. Cada mesa com QR **ativado** e link gerado.
4. Produtos com **Pedido na mesa (QR)** marcado em **Cardápio → Produtos** (independente de delivery).

### Ativar o módulo QR

No mesmo bloco de módulos, abaixo de **Gestão de mesas**, você verá **Pedido por QR na mesa**.

- **Ativado** — você pode habilitar QR por mesa e os clientes podem enviar pedidos pendentes de confirmação.
- **Desativado** — os controles QR não aparecem na lista nem no painel da mesa.

### QR por mesa

Com o módulo QR ativo, cada mesa tem controles para:

| Ação | Para que serve |
|--------|----------------|
| Ativar QR nesta mesa | Gera o link público dessa mesa |
| **Copiar link** | Colar no WhatsApp ou onde você compartilha o cardápio |
| **Descargar PNG** | Imagem do código QR para imprimir na mesa |
| **Regenerar link** | Invalida o QR anterior e cria um novo (imprima novamente se já distribuiu códigos) |

O link tem a forma `https://warocol.com/{seu-negócio}/mesa/{código}` e **permanece estável** até você usar **Regenerar link**.

No desktop você também verá uma coluna **QR** na tabela de mesas com acesso rápido para copiar e baixar.

### O que o cliente faz

1. Escanea o QR ou abre o link.
2. Vê o cardápio (apenas produtos marcados para QR).
3. Monta o pedido, escolhe o método de pagamento e envia.
4. Vê uma mensagem de confirmação: o restaurante revisará o pedido antes de preparar.

### O que a equipe faz depois

Os pedidos pendentes aparecem em **Despacho → Pedidos na mesa (QR)** como uma lista (uma linha por pedido). Clique no pedido para ver o detalhe e pressione **Aceitar pedido** ou **Rejeitar**. Ao aceitar, os itens são adicionados ao tab dessa mesa no **POS** e, se as comandas estão ativas, são enviados à cozinha. Ver [Despacho](../despacho#pedidos-en-mesa-qr).

A campainha de notificações abre o **detalhe** do pedido quando disponível; caso contrário, a lista filtrada por essa mesa.

---

## Perguntas frequentes

**Onde os pedidos das mesas são feitos?**
No **POS**. Ao entrar com o módulo ativo você verá o mapa do salão; clique em uma mesa para abrir sua sessão de pedido.

**Posso ter mesas configuradas sem ativar o módulo?**
Sim. As mesas ficam salvas mesmo com o módulo desativado. Ao ativar novamente, todas as mesas aparecem no mapa.

**O que acontece se desativo o módulo com mesas ocupadas?**
O toggle muda a vista do POS, mas as sessões abertas não são fechadas. Recomendamos fechar todos os pedidos antes de desativar o módulo.

**Uma mesa desativada se perde para sempre?**
Não. Fica na lista de mesas inativas e você pode reativá-la quando quiser.

**Como difere do pedido por QR de Delivery?**
Em **Delivery**, o cliente pede pelo canal online (entrega, retirada ou consumo no local) e o pedido segue status como Pendente → Confirmado → Em preparação. No **pedido QR na mesa**, o cliente está fisicamente em uma mesa específica, o cardápio é só para essa mesa e o pedido fica **pendente de aceitação** em **Despacho → Pedidos na mesa (QR)** até que a equipe confirme.

**A URL muda se abro Operações → Mesas novamente?**
Não. O link é estável enquanto você não usa **Regenerar link** nessa mesa.

**O que o cliente vê depois de enviar o pedido?**
Uma tela de sucesso indicando que o restaurante confirmará o pedido. Os itens **não** aparecem no POS nem são preparados até que alguém os **aceite** no Despacho.

**Um produto não aparece no cardápio QR?**
Verifique que tem ativo **Pedido na mesa (QR)** em **Cardápio → Produtos** e que o módulo QR e o QR dessa mesa estão ligados.
