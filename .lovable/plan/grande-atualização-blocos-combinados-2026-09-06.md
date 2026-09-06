# Grande atualização — blocos combinados

As partes que faltavam do roteiro antigo (4, 5 e 6) entram juntas com as novidades (7 a 11), em 4 blocos. Cada bloco é testável e publicável sozinho, com espaço para correções antes do próximo.

## Bloco A — Rate/idade dos elencos + código de bandeira

- **Rate e idade dinâmicos**: alterar o rate do clube recalibra apenas os jogadores gerados com vínculo ao rate, preservando a hierarquia do elenco; ao avançar o ano, os jogadores envelhecem com evolução para jovens e regressão para veteranos, com prévia antes de confirmar. Elencos de anos anteriores continuam intocados.
- **Bandeira personalizada**: o código `<:flag_nb:1501023624507953153>` passa a aparecer como 🇧🇷 em qualquer texto da interface, inclusive vindo do banco. Nenhum outro emoji ou código é alterado. Na leitura de elencos por texto, o código vale como "Brasil" e não entra no nome do jogador.
- Aceite: mudar o rate mantém a ordem de qualidade do elenco; colar uma lista com o código mostra a bandeira e o parser entende Brasil.

## Bloco B — Calendário global de temporadas + Rivalidades e Clássicos

- **Avançar calendário**: um fluxo central para escolher competições e clubes que mudam de ano, com prévia das mudanças, validações e execução em lote.
- **Rivalidades**: botão **Criar Clássico** (Time A × Time B, nível 1/5 a 5/5) e um menu para ver, editar e excluir os clássicos. Quanto maior o nível, mais faltas e cartões na partida; força e gols não mudam. Clássicos ganham um foguinho no canto nas fotos.
- Aceite: todas as competições escolhidas chegam ao mesmo ano em uma operação; um clássico 5/5 mostra claramente mais cartões que o mesmo jogo sem rivalidade.

## Bloco C — Formato "Fase de Liga + Mata-Mata" + Modo foto de partida

- **Novo formato**: tabela única com todos contra todos, número de classificados configurável e geração automática do mata-mata ao encerrar a fase de liga, integrado a abas, histórico, estatísticas, exportação e temporadas.
- **Foto de uma partida**: botão de câmera dentro do jogo gerando uma imagem só dele — escudos, siglas, placar, gols com minuto e autor, cartões e o foguinho quando for clássico — usando as mesmas configurações de foto já existentes.
- Aceite: a fase inicial mostra uma classificação única e os melhores avançam corretamente; a imagem da partida sai legível no celular e no computador.

## Bloco D — Pastas e limite de times

- **Pastas**: varredura completa das pastas de clubes e competições (mover, renomear, excluir, navegar, migalhas, busca), corrigindo os bugs encontrados e somando utilidades: contagem de itens, mover vários selecionados de uma vez e aviso claro ao excluir pasta com conteúdo.
- **Limite de times**: hoje só chegam 1000 registros por vez, então acima disso clubes, jogadores e competições somem da tela. Passam a ser carregados em blocos até vir tudo.
- Aceite: nenhuma ação de pasta deixa itens perdidos, e uma conta com mais de 1000 clubes vê todos sem lentidão.

## Detalhes técnicos

- **A**: metadados de carreira em `players` (âncora de rate, desvio individual, potencial) via migração; recálculo em `playerSkill.ts` + `ClubSquadPage`. `src/lib/textEmoji.ts` com `replaceCustomEmojis(text)` puro + componente `RichText`, aplicado nos pontos de render e na normalização do `squadTextParser.ts`; testes em `src/test/textEmoji.test.ts`.
- **B**: extração da transição de temporada de `TournamentDetailPage` para funções reutilizáveis + ação em lote. Nova tabela `public.rivalries` (`user_id`, `team_a_id`, `team_b_id`, `level 1..5`) com GRANTs e RLS por `auth.uid()::text = user_id`, par único. `rivalryLevel` opcional em `simulateFullMatch`/`generateCardsAndFouls` multiplicando taxas de falta/cartão (≈ 1 + 0,18 × nível); foguinho via `data-photo-rivalry` lido em `screenshotUtils.ts`.
- **C**: novo valor em `TournamentFormat` com geração de jogos, classificação, abas e snapshot; layout `match` em `photoMode.ts` com preset próprio e `ScreenshotButton mode="match"` no `MatchPopup`.
- **D**: auditoria de `TeamsPage.tsx`, `CompetitionsPage.tsx`, `FolderBreadcrumb.tsx` e das ações de pasta do `tournamentStore.ts` (exclusão recursiva de subpastas); helper `fetchAll(query)` com `.range()` paginado em `loadAll`.

Só o Bloco A e o Bloco B mexem no banco.
