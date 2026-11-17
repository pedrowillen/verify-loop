# verify-loop

[English](README.md)

Um plugin do Claude Code que dá ao Claude um **loop de verificação** e **padrões para economizar tokens**: rodar a mudança de verdade antes de revisar, limitar as rodadas de correção, registrar commits sem verificação e encurtar saídas de teste longas.

> **Créditos.** Este projeto foi feito com base nas práticas publicadas pela **Anthropic** e pelo **time do Claude Code**, principalmente o post [How the Claude Code team thinks about verification](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/) e os guias oficiais sobre [gestão de custos](https://code.claude.com/docs/en/costs), o [advisor](https://code.claude.com/docs/en/advisor) e os [plugins de code intelligence](https://code.claude.com/docs/en/plugins/code-intelligence). É um projeto independente da comunidade, **sem vínculo com a Anthropic e sem endosso dela**.

## O que vem no plugin

| Peça | O que faz | Custo em tokens |
|---|---|---|
| Regras do fluxo | Injetadas no início da sessão: planejar → implementar → verificar → revisar → verificar de novo → commit. No máximo 3 rodadas de correção, nunca enfraquecer testes, nada de repetir teste instável até passar. | ~400 tokens por sessão |
| Skill `/verify-loop:verify` | Acha os comandos do próprio projeto, roda primeiro os checks baratos (lint, testes, build) e depois faz um smoke test da parte alterada com o app rodando. | Só quando usada |
| Gate de commit (modo observe) | A cada `git commit`, registra quais skills de verificação e revisão rodaram na sessão; `none` marca um commit sem verificação. Nunca bloqueia. | Zero |
| Corte da saída de testes | Reescreve comandos de teste simples (`npm test`, `./mvnw verify`, `pytest`, `go test`...) para mostrar só as últimas 100 linhas, mantendo o código de saída. | Economiza |
| Skill `/verify-loop:setup` | Aplica uma vez as configurações recomendadas, com backup e a sua aprovação. | Uma vez |

### Configurações recomendadas (aplicadas pelo `/verify-loop:setup`)

- **Modelo principal e advisor** escolhidos conforme o seu projeto, veja [Quais modelos usar](#quais-modelos-usar). O modelo principal roda com esforço **medium**.
- **Subagentes** no Sonnet, para buscas amplas não rodarem no modelo caro.
- **Sugestões de prompt** e **resumo de sessão** desligados: os dois fazem requisições enquanto você está parado.
- **Instrução de compactação** no `~/.claude/CLAUDE.md`, para o resumo da conversa preservar decisões, arquivos alterados e erros.

## Quais modelos usar

O modelo principal faz quase todo o trabalho; o [advisor](https://code.claude.com/docs/en/advisor) é um modelo mais forte que ele consulta nos momentos de decisão (planejamento, erros que se repetem). A nossa recomendação:

| Sua situação | Modelo principal | Advisor |
|---|---|---|
| **Plano Max ou Ultra**, ou projeto complexo (código grande, arquitetura, bugs difíceis) | Opus 5.5, esforço medium | Fable 5.2 |
| **Plano Pro**, ou projeto mais simples (app pequeno, scripts, features de rotina) | Sonnet 5.5, esforço medium | Opus 5.5 |

**A complexidade do projeto pesa mais do que o plano.** Quem tem Max e está fazendo um script pequeno se dá melhor com a linha do Pro, e quem tem Pro num código difícil pode subir para Opus 5.5 + Fable 5.2 se os limites permitirem.

O Claude Code aceita as duas combinações: o advisor precisa ser igual ou mais forte que o modelo principal. Antes de escolher o Fable, leia [Advisor e a cobrança do Fable](#advisor-e-a-cobrança-do-fable): em alguns planos ele é cobrado em usage credits. O `/verify-loop:setup` pergunta qual linha combina com você.

## Instalação

Numa sessão do Claude Code (terminal, app desktop ou VS Code):

```
/plugin marketplace add pedrowillen/verify-loop
/plugin install verify-loop@verify-loop
```

Depois rode a configuração, uma vez só:

```
/verify-loop:setup
```

Em seguida, abra uma sessão nova. No app desktop, depois de adicionar o marketplace, também dá para instalar por **+ → Add plugins**.

### Requisitos

- **Claude Code** com suporte a plugins.
- **bash** para os hooks (no Windows: [Git for Windows](https://git-scm.com/download/win), que o Claude Code já usa).
- **Node.js** para o corte da saída de testes.
- Opcional: [ponytail](https://github.com/DietrichGebert/ponytail) para o `/ponytail-review`. Sem ele, as regras usam `/code-review` e `/simplify`.

## O fluxo

1. **Planejar.** Consultar o advisor ao planejar uma feature nova e quando um erro se repete. Não para dar a tarefa como pronta: as revisões cobrem isso.
2. **Implementar**, com teste para lógica nova.
3. **`/verify-loop:verify`**: rodar a mudança de verdade. No máximo 3 rodadas de correção; depois, parar e perguntar.
4. **`/ponytail-review`** em mudanças não triviais.
5. **`/security-review`** só quando o diff mexe em autenticação, entrada de usuário, segredos, rede, arquivos, dependências ou dados pessoais.
6. **Verificar de novo** se as revisões mudaram código.
7. **Commit.**

O `CLAUDE.md` do seu projeto vence em comandos e em regras mais rígidas. Se ele repetir ou contradizer este fluxo, o Claude mostra as linhas e propõe removê-las.

## Log do gate de commit

O gate grava em `~/.claude/plugins/data/verify-loop-verify-loop/gate.log`:

```
2026-11-17 18:02:11 | ponytail-review security-review verify | C:/projects/app | <id da sessão>
2026-11-17 19:40:05 | none | C:/projects/app | <id da sessão>
```

Use por uma ou duas semanas para ver com que frequência saem commits sem verificação. Limite conhecido: ele conta qualquer revisão feita na sessão, mesmo que tenha havido edições depois dela.

## Opcional: code intelligence

Os servidores de linguagem deixam o Claude navegar pelo código por símbolo e ver erros de tipo logo depois de cada edição, em vez de fazer grep e ler vários arquivos. Instale o servidor e depois o plugin oficial:

| Linguagem | Servidor | Plugin |
|---|---|---|
| TypeScript / JavaScript | `npm install -g typescript-language-server typescript` | `typescript-lsp@claude-plugins-official` |
| Java | [Eclipse JDT.LS](https://download.eclipse.org/jdtls/milestones/) + JDK 17+ | `jdtls-lsp@claude-plugins-official` |
| Outras | veja a [tabela oficial](https://code.claude.com/docs/en/plugins/code-intelligence) | |

**Java no Windows:** o plugin roda um comando chamado `jdtls`, e o `jdtls.bat` que vem no pacote termina com `pause`, o que trava. Extraia o JDT.LS (por exemplo em `%USERPROFILE%\.local\share\jdtls`) e coloque este `jdtls.cmd` numa pasta do `PATH` (exige Python):

```bat
@echo off
python "%USERPROFILE%\.local\share\jdtls\bin\jdtls" %*
```

## Advisor e a cobrança do Fable

Em alguns planos, o uso do Fable (inclusive como advisor) é cobrado em **usage credits**. Quando isso acontece, a linha do Fable no seletor `/model` mostra "Requires usage credits", e o Claude Code pede consentimento uma única vez, pelo `/model fable`; depois disso não aparece mais nenhum aviso e não há limite de gasto. Se você vir esse rótulo e não quiser cobrança extra, use o Opus 5.5 como advisor. Acompanhe a linha de usage credits no `/usage` e defina um limite mensal em claude.ai → Settings → Usage.

Cada consulta ao advisor relê a conversa inteira sem cache, então sessões curtas (`/clear` entre tarefas sem relação) também deixam o advisor mais barato.

## Desinstalar

```
/plugin uninstall verify-loop@verify-loop
```

O setup guarda um backup em `~/.claude/settings.json.bak-verify-loop`. A instrução de compactação fica entre os marcadores `<!-- verify-loop:compact -->` no `~/.claude/CLAUDE.md`.

## Licença

[MIT](LICENSE)
