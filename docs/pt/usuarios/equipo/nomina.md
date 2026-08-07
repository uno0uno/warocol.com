# Folha de Pagamento e benefícios sociais

Em **Equipe → Folha de Pagamento** você gerencia as **prestações sociais legais colombianas** (Prima, Cesantías, Férias, Equipamento de Trabalho, Horas Extras) e os pagamentos de **PILA** (seguridade social).

> **Diferença em relação a Salários:** a aba **Salários** trata dos pagamentos mensais do **salário base**. A Folha de Pagamento é complementar — trata das **prestações legais** e da **seguridade social**, que são pagas em frequências diferentes (semestrais, anuais, mensais conforme o conceito). Veja [Registrar pagamento de salário](./registrar-pago).

## Como acessar

Menu lateral → **Equipe → Folha de Pagamento**.

---

## Filtros

| Filtro | Opções |
|--------|----------|
| Ano | Últimos 5 anos |
| Mês | Mês específico do ano selecionado |
| Busca | Por nome do funcionário |

---

## Tabela de benefícios

Uma linha por funcionário, uma coluna por conceito:

| Coluna | O que representa |
|---------|----------------|
| **Bônus S1** | Prima de serviços do primeiro semestre (pagamento em junho) |
| **Bônus S2** | Prima de serviços do segundo semestre (pagamento em dezembro) |
| **Verba de Desligamento** | Aporte anual à verba de desligamento do funcionário |
| **Juros da Verba de Desligamento** | Juros sobre a verba de desligamento (12% ao ano) |
| **Férias** | Pagamento de férias usufruídas |
| **Equipamento de Trabalho** | Três pagamentos por ano (abril, agosto, dezembro) para funcionários com salário ≤ 2 SMMLV |
| **Horas Extras** | Pagamentos por horas extras do período |

Cada célula mostra:

- **Badge verde com valor** — o benefício já foi pago naquele período
- **"Pendente"** — o pagamento ainda não foi registrado

### Tipos de contrato

- **Funcionário** — aplica-se a todos os benefícios
- **Diarista** — aplica-se a benefícios, exceto Equipamento de Trabalho
- **Prestador de serviços** — excluído desta visualização (gerido por honorários)

---

## Registrar benefícios

Você pode selecionar várias células de uma vez:

- **Clique em uma célula** — seleciona aquele pagamento individual
- **Clique em uma linha** — seleciona todos os benefícios daquele funcionário
- **Clique em uma coluna** — seleciona aquele conceito para todos os funcionários
- **Seleção em massa mista** — combine células individuais

Quando há uma seleção ativa, aparece uma **barra de ações** no topo com o total a registrar e um botão para abrir o painel lateral de pagamento.

### Painel lateral de pagamento

| Campo | Descrição |
|-------|-------------|
| Valor | Por padrão o calculado pelo WARO; você pode ajustá-lo |
| Data de pagamento | Data em que o desembolso foi realizado |
| Método de pagamento | Transferência, dinheiro, cheque, etc. |
| Referência | Número do comprovante (opcional) |
| Observações | Observação adicional (opcional) |

Ao confirmar, todos os benefícios selecionados ficam registrados como pagos e o badge muda para verde.

---

## PILA (Planilla Integrada de Liquidación de Aportes)

A seção **PILA** fica separada no rodapé da tela. É o pagamento mensal de seguridade social (saúde, previdência, riscos laborais, parafiscais) que cobre tanto o **aporte do funcionário** quanto o **aporte do empregador**.

### Períodos pendentes

Lista os meses com pagamento de seguridade social pendente. Cada linha mostra:

- Mês e ano
- Total a pagar (aporte do funcionário + empregador)
- Quantidade de funcionários incluídos

### Registrar o pagamento de PILA

1. Toque no botão **Registrar PILA** da linha.
2. Digite a data e o método de pagamento.
3. Anexe o comprovante de PILA, se tiver.
4. Confirme.

### Histórico de PILA

Abaixo dos pendentes aparece a lista de PILA já pagos com data, valor e método.

---

## Perguntas frequentes

**O WARO calcula automaticamente os valores de cada benefício?**
Sim, na maioria dos casos. A plataforma usa o salário base configurado do funcionário e os percentuais legais colombianos para calcular Prima, Cesantías, Juros, Férias e Equipamento de Trabalho. Você sempre pode ajustar o valor manualmente antes de registrar o pagamento.

**Qual é a diferença em relação a Registrar pagamento de salário?**
"Registrar Pagamento" em **Salários** é o desembolso do salário corrente mensal. **Folha de Pagamento** é para as prestações legais e a seguridade social, que têm frequências e regras diferentes.

**E se eu tiver um prestador de serviços?**
Os prestadores de serviços são excluídos desta visualização porque não geram prestações sociais. Os pagamentos deles são tratados como **Despesas** (Finanças → Despesas) ou como um esquema de salário por horas, conforme o caso.

**Posso pagar benefícios de vários funcionários de uma vez?**
Sim. Selecione a coluna (por exemplo, "Bônus S1") e todas as células daquele conceito ficam selecionadas; o painel de pagamento consolida o valor total.

**Como sei se um mês de PILA já foi pago?**
Se estiver na lista de **histórico** e não em **pendentes**, já foi registrado. Para ver o comprovante, abra o detalhe do pagamento.
