# Turnos

Os **turnos** são modelos de horário reutilizáveis (nome + hora de início e fim) que você usa ao fazer um arqueo **Por modelo** em Finanças. Não substituem a planejamento de pessoal nem o controle de presença: só definem a janela de tempo que o arqueo de caixa vai conciliar.

## Como acessar

Menu lateral → **Operações → Turnos**.

Na parte superior você verá quantos turnos estão ativos e inativos. A lista mostra nome, horário e status.

> **Permissões:** configurar turnos requer acesso ao módulo **Operações**. Registrar um arqueo com esse modelo é feito em **Finanças → Arqueo de caixa** (módulo **Finanças**). Ver [Arqueo de caixa](../finanzas#arqueo-de-caja).

---

## Criar um turno

Clique em **+ Novo turno**. Preencha:

| Campo | Descrição |
|-------|-----------|
| **Nome** | Identificador visível (ex. Manhã, Tarde, Noite). Obrigatório, até 80 caracteres. |
| **Início** | Hora de início do turno (formato 24 h). |
| **Fim** | Hora de fim do turno. |
| **Cruza meia-noite** | Ative se o turno termina no dia seguinte (ex. 22:00 – 06:00). |

Confirme com **Criar turno**. O turno fica **ativo** imediatamente e aparece no menu de arqueos por modelo.

---

## Editar um turno

Clique no ícone de lápis ao lado do turno. Você pode alterar nome, horas e a opção **Cruza meia-noite**. Salve com **Salvar alterações**.

Os arqueos **já registrados** conservam a etiqueta do nome que tinham no momento do fechamento; alterar o modelo não reescreve o histórico.

---

## Desativar e reativar

- **Desativar** — o turno deixa de aparecer ao criar um arqueo novo, mas continua visível na lista como inativo. Os arqueos passados que o usaram não são modificados.
- **Reativar** — volta a estar disponível em Finanças → Arqueo → **Por modelo**.

Não se eliminam turnos na interface; desativar é a forma de retirar um que já não usa.

---

## Relação com o arqueo de caixa

| Ação | Onde |
|------|------|
| Definir modelos (Manhã, Tarde…) | **Operações → Turnos** |
| Fechar caixa com um modelo | **Finanças → Arqueo → Por modelo** |
| Fechar com horas manuais sem modelo | **Finanças → Arqueo → Período personalizado** |
| Fechar o dia calendário completo | **Finanças → Arqueo → Dia completo** |

Ao arquear por modelo você escolhe o **turno** e o **dia**; as horas são preenchidas conforme o modelo. Você pode fazer vários arqueos no mesmo dia se as janelas **não se superponem** (por exemplo Manhã e Tarde). Ver a seção *Vários arqueos no mesmo dia* em [Arqueo de caixa](../finanzas#arqueo-de-caja).

---

## Perguntas frequentes — Turnos

**Os turnos controlam quem pode cobrar no POS?**
Não. Só definem janelas de tempo para o arqueo de caixa.

**Posso ter dois modelos com o mesmo horário?**
Sim, se os nomes são distintos (ex. "Manhã salão" e "Manhã terraço"). Ao arquear você escolhe qual se aplica.

**Desativei um turno e já não aparece ao arquear. O que faço?**
Reative pelo ícone de flecha circular na lista, ou crie um modelo novo.

**Turno noturno que passa de um dia a outro?**
Ative **Cruza meia-noite** ao criar ou editar o modelo (ex. 22:00 – 06:00).
