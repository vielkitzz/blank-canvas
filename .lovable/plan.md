# Grande atualização — novas fases (7 a 11)

Continuação do roteiro já aprovado (Partes 1–6: modo foto, gerador de elencos, texto, rate/idade, calendário global, Liga + Mata-Mata). As novas funcionalidades entram como fases independentes, uma por dia, cada uma testável e publicável sozinha.

## Fase 7 — Código de bandeira personalizado (rápida)

- Reconhecer exatamente o código `<:flag_nb:1501023624507953153>` e exibi-lo como 🇧🇷 em qualquer texto da interface, inclusive vindo do banco.
- Nada de outros emojis ou códigos é alterado.
- Aplicado na leitura/adição de elencos por texto: o código vale como "Brasil" ao interpretar nacionalidade, e some do nome do jogador.
- Critério de aceite: colar uma lista com o código em qualquer campo (nome, nacionalidade, nome de time/competição) mostra a bandeira e o parser entende Brasil.

## Fase 8 — Rivalidades e Clássicos

- Botão **Criar Clássico**: escolher Time A, Time B e nível de rivalidade de 1/5 a 5/5.
- Menu **Rivalidades** para listar, editar e excluir os clássicos existentes.
- Efeito na simulação: quanto maior o nível, mais faltas e cartões (amarelos e vermelhos) na partida; nível 5 é o mais quente. Gols e força dos times não mudam.
- Nas fotos, partidas de clássico ganham um foguinho no canto.
- Critério de aceite: um clássico 5/5 simulado várias vezes mostra claramente mais cartões que o mesmo confronto sem rivalidade, e o foguinho aparece na foto.

## Fase 9 — Modo foto de uma partida

- Botão de câmera dentro da partida, gerando uma imagem só daquele jogo: escudos, siglas, placar, gols com minuto e autor, cartões e o foguinho quando for clássico.
- Usa a mesma configuração de foto já existente (fundo, zoom, ícone da competição, tema claro/escuro).
- Critério de aceite: a imagem sai legível no celular e no computador, sem cortes.

## Fase 10 — Pastas: utilidade e correção de bugs

- Varredura completa das pastas de clubes e de competições: mover, renomear, excluir, arrastar, navegação por duplo clique, migalhas de pão e comportamento da busca.
- Melhorias de utilidade: contagem de itens na pasta, mover vários selecionados de uma vez, e ação de esvaziar/excluir pasta com aviso claro do que acontece com o conteúdo.
- Cada bug encontrado vira correção nesta mesma fase.
- Critério de aceite: nenhuma ação de pasta deixa clubes ou competições "perdidos", e a busca continua encontrando itens dentro de pastas.

## Fase 11 — Limite de times

- Hoje o carregamento traz no máximo 1000 registros por tabela, então acima disso clubes, jogadores e competições simplesmente somem da tela.
- Passar a carregar em blocos até trazer tudo, para clubes, jogadores, competições, históricos e pastas.
- Critério de aceite: uma conta com mais de 1000 clubes vê todos, e a lista continua abrindo rápido.

## Detalhes técnicos

- **Fase 7**: função pura `replaceCustomEmojis(text)` em `src/lib/textEmoji.ts` + componente `RichText`; aplicada nos pontos de renderização de nome de jogador/clube/competição e em `squadTextParser.ts` (normalização antes do parse, mapeando o código para `Brasil`). Testes em `src/test/textEmoji.test.ts`.
- **Fase 8**: nova tabela `public.rivalries` (`id`, `user_id`, `team_a_id`, `team_b_id`, `level 1..5`, `created_at`) com GRANTs e RLS por `auth.uid()::text = user_id`, índice por par ordenado e unicidade do par. Store: `rivalries`, `addRivalry`, `updateRivalry`, `deleteRivalry`. Simulação: `rivalryLevel` opcional em `simulateFullMatch`/`generateCardsAndFouls`, multiplicando as taxas de falta/cartão (ex.: 1 + 0,18 × nível). Foguinho via marcação `data-photo-rivalry` lida por `screenshotUtils.ts`.
- **Fase 9**: novo layout `match` em `photoMode.ts` + preset de largura/zoom; render dedicado reutilizando o conteúdo do `MatchPopup` com `ScreenshotButton mode="match"`.
- **Fase 10**: auditoria de `TeamsPage.tsx`, `CompetitionsPage.tsx`, `FolderBreadcrumb.tsx` e das ações de pasta no `tournamentStore.ts` (incluindo exclusão recursiva de subpastas, hoje só desvincula o nível direto).
- **Fase 11**: helper `fetchAll(query)` com `.range()` paginado (blocos de 1000) usado em `loadAll` do `tournamentStore.ts`.

## Ordem e ritmo

7 (rápida) → 8 → 9 → 10 → 11. Só a Fase 8 mexe no banco.
