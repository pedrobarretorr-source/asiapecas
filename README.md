# Asia Pecas

Aplicacao React + Vite com duas responsabilidades no mesmo projeto:

1. Vitrine publica e captacao de leads em `/cotacao`
2. Sistema interno de operacao comercial, estoque e pos-venda em rotas protegidas

O projeto foi originalmente gerado com Lovable e hoje ja contem uma base de e-commerce B2B acoplada a um sistema interno com Supabase.

## Objetivo atual

A prioridade desta etapa e transformar a pagina de vendas no ponto principal de entrada do negocio, sem descartar nem quebrar o sistema interno.

Isso significa:

- a home publica deve virar a entrada principal
- o sistema interno deve continuar acessivel em rotas dedicadas
- a separacao entre "site comercial" e "app interno" deve ficar explicita na arquitetura

## Estado atual

### Rotas publicas principais

- `/`
- `/cotacao`
- `/cotacao/categorias`
- `/cotacao/modelos`
- `/cotacao/c/:slug`
- `/cotacao/m/:slug`
- `/cotacao/p/:material`
- `/login`
- `/reset-password`

### Rotas internas protegidas

- `/app`
- `/app/admin/vitrine`
- `/app/catalogo`
- `/app/catalogo/categorias`
- `/app/estoque`
- `/app/clientes`
- `/app/clientes/:id`
- `/app/vendas`
- `/app/pos-venda`
- `/app/pedidos/novo`
- `/app/prospeccao`
- `/app/pesquisa-mercado`
- `/app/assistente`
- `/app/relatorio`
- `/app/treinamento`
- `/app/configuracoes`

### Compatibilidade temporaria

As rotas internas antigas sem o prefixo `/app` permanecem redirecionando para os novos caminhos para evitar quebra de acesso salvo.

## Problema principal

Antes da reestruturacao, a rota raiz `/` abria o sistema interno protegido por login. Isso conflitava com o objetivo comercial, porque a entrada principal do dominio nao era uma pagina de vendas.

Consequencias:

- perda de clareza para trafego pago, SEO e campanhas
- experiencia de primeira visita errada
- misturar produto interno com aquisicao comercial

## Direcao de reestruturacao

A proposta de reestruturacao e:

1. fazer a home publica virar a entrada principal do projeto
2. mover o sistema interno para uma area dedicada, por exemplo `/app` ou `/interno`
3. manter login e rotas operacionais acessiveis sem remover funcionalidades
4. evoluir a home comercial antes de expandir funcionalidades secundarias

## Ordem de trabalho

1. Documentacao da reestruturacao
2. Mudanca de arquitetura de rotas sem quebrar o sistema interno
3. Home comercial como entrada principal
4. Refinos de conversao da pagina de vendas
5. Ajustes nas funcionalidades publicas e administrativas
6. Expansao das funcionalidades novas

## Status da implementacao

Concluido nesta etapa:

- `/` agora aponta para a landing comercial sem catalogo embutido
- `/cotacao` agora concentra a area separada de catalogo e cotacao
- o sistema interno foi movido para `/app`
- login redireciona para `/app`
- navegacao interna principal foi ajustada para a nova base
- rotas antigas internas continuam funcionando por redirecionamento

## Documentacao desta fase

O plano detalhado desta reestruturacao esta em:

- [docs/restructuring-plan.md](docs/restructuring-plan.md)

## Observacoes tecnicas

- O frontend usa Vite e sobe localmente em `http://127.0.0.1:4173`
- O build local ja foi validado com `npm run build`
- As edge functions da pasta `supabase/functions` foram desacopladas do gateway da Lovable e agora usam:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` ou modelos especificos por funcao, como `OPENAI_MODEL_CHAT`
- `FIRECRAWL_API_KEY` nas funcoes que dependem de busca web verificada
- O dominio publico de producao deve ser definido por `VITE_SITE_URL` no frontend e `PUBLIC_SITE_URL` na funcao `generate-sitemap`
