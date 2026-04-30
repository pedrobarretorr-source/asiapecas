# Plano De Reestruturacao

## Contexto

O projeto ja possui uma vitrine publica funcional em `/cotacao` e um sistema interno robusto em rotas protegidas. A reestruturacao nao vai remover o sistema interno. O objetivo e reorganizar a entrada principal do produto para priorizar aquisicao e conversao.

## Objetivo principal

Transformar a pagina de vendas no ponto principal do site, preservando o acesso ao sistema interno por rotas dedicadas e preparando o projeto para evolucoes comerciais futuras.

## Principios da reestruturacao

- nao jogar fora o sistema interno
- nao quebrar rotas operacionais existentes sem substituicao controlada
- separar claramente "site comercial" de "aplicacao interna"
- priorizar conversao antes de novas funcionalidades
- reaproveitar ao maximo a base publica ja existente

## Resultado esperado

Ao final desta fase:

- a home publica sera a pagina principal do dominio
- a navegacao interna continuara acessivel por login e rotas dedicadas
- a pagina comercial tera hierarquia de venda melhor
- o projeto ficara preparado para evoluir funcionalidades publicas sem misturar com a operacao interna

## Estrategia de rotas

### Estado atual

- `/` aponta para o dashboard interno protegido
- `/cotacao` concentra a experiencia publica de vendas

### Estado desejado

- `/` passa a ser a home comercial principal
- `/cotacao` pode continuar existindo por compatibilidade, com redirect ou pagina espelho controlada
- o sistema interno vai para uma base dedicada

### Direcao recomendada

Opcao preferencial:

- `/` home comercial
- `/app` entrada do sistema interno
- `/app/admin/vitrine`
- `/app/catalogo`
- `/app/estoque`
- `/app/clientes`
- `/app/vendas`
- etc.

Alternativa valida:

- `/` home comercial
- `/interno` entrada do sistema interno

### Regra operacional

Durante a migracao, sera preciso manter compatibilidade temporaria para evitar quebra de bookmarks, links salvos e processos internos.

## Fases de execucao

## Fase 1 - Reestruturacao de acesso

Objetivo:

Separar entrada comercial da entrada operacional.

Escopo:

- criar a nova base de rotas internas
- mover a rota do dashboard interno para `/app` ou equivalente
- manter login funcional
- manter rotas antigas com redirecionamento controlado quando necessario
- garantir que a home publica seja acessivel sem autenticacao

Entregaveis:

- roteamento reorganizado
- acesso ao sistema interno preservado
- entrada principal comercial ativa

Status atual:

- concluido o movimento da entrada publica para `/`
- concluida a migracao principal do sistema interno para `/app`
- concluidos redirects de compatibilidade para rotas internas antigas
- concluida a separacao entre landing comercial em `/` e catalogo publico em `/cotacao`
- concluido o formulario final de solicitacao de cotacao na landing
- pendente revisar mais links administrativos secundarios e avancar na reescrita comercial da home

## Fase 2 - Reescrita da home comercial

Objetivo:

Transformar a atual vitrine em uma pagina de vendas de verdade.

Escopo:

- reposicionar a mensagem principal
- reforcar proposta de valor
- destacar beneficios concretos
- melhorar CTA principal e CTAs secundarios
- incluir prova de autoridade e confianca
- organizar melhor narrativa da pagina antes do catalogo

Blocos previstos:

- hero com proposta clara
- prova rapida: estoque, segmentos, cobertura, prazo
- beneficios
- segmentos atendidos
- como funciona
- pecas em destaque
- FAQ
- CTA final

## Fase 3 - Refinos de conversao

Objetivo:

Melhorar taxa de lead e qualidade comercial.

Escopo:

- revisar formulacoes dos formularios
- revisar gating de preco
- revisar CTA de WhatsApp
- melhorar captura e qualificacao de leads
- reforcar SLA de atendimento
- revisar elementos de friccao no catalogo

## Fase 4 - Consolidacao da camada publica

Objetivo:

Preparar o produto para expandir funcionalidades publicas sem impactar o interno.

Escopo:

- consolidar SEO
- revisar URLs canonicas
- ajustar dominio publico real
- revisar analytics e eventos de conversao
- preparar blocos reutilizaveis de pagina comercial

## Ajustes planejados por area

## Rotas e navegacao

- separar rotas publicas e internas em grupos claros
- retirar o dashboard interno da raiz
- manter acesso interno por caminho dedicado
- revisar links absolutos que hoje apontam para `/cotacao`
- revisar menus, breadcrumbs e redirecionamentos apos login

## Home comercial

- tornar a home a principal entrada
- manter o catalogo como parte do funil, nao como unica narrativa
- adicionar secoes de prova e conversao antes do catalogo
- dar mais contexto comercial ao hero atual

## Catalogo publico

- manter a busca e filtros existentes
- reduzir friccao entre navegar e pedir cotacao
- revisar estrategia de exibicao de preco
- tratar melhor "estoque real", "sob consulta" e urgencia comercial

## Captura de lead

- manter `quote_requests`
- manter `b2b_leads`
- revisar obrigatoriedade e ordem dos campos
- preparar proxima etapa para automacoes comerciais

## Area administrativa da vitrine

- manter o painel atual
- adaptar links para a nova arquitetura de rotas
- preservar banners, destaques, promocoes e configuracoes de tracking

## SEO e analytics

- revisar `SITE_URL`
- alinhar canonical com dominio final
- manter captura de UTM
- preservar tracking de lead e conversao
- revisar nomenclatura de eventos se necessario

## Riscos mapeados

- quebra de acesso interno por mudanca de rota
- links administrativos apontando para caminhos antigos
- redirecionamentos incompletos apos login
- conteudo duplicado se `/` e `/cotacao` coexistirem sem estrategia
- perda de consistencia em SEO se canonical e dominio nao forem revisados

## Criterios de sucesso desta fase

- o visitante entra no dominio e encontra a pagina comercial, nao o sistema interno
- a equipe interna continua acessando o sistema sem perder fluxo de trabalho
- a navegacao publica fica mais clara e mais orientada a conversao
- a base fica pronta para os ajustes seguintes nas funcionalidades publicas

## Fora do escopo imediato

Estas frentes sao importantes, mas nao sao prioridade agora:

- portal do cliente
- area "minha maquina"
- recompra recorrente
- automacoes comerciais mais avancadas
- propostas online com aceite digital
- novos modulos de pos-cotacao

Esses itens serao tratados depois que a entrada comercial estiver resolvida.

## Proxima implementacao

A proxima etapa pratica deve ser:

1. introduzir a nova base de rotas internas
2. tornar `/` a entrada publica
3. manter compatibilidade provisoria para acessos internos antigos
4. ajustar links administrativos que hoje assumem `/cotacao` ou `/`

Depois disso, a home comercial pode ser refinada com menos risco de misturar responsabilidades.
