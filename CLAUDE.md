# CLAUDE.md

Este arquivo fornece orientação ao Claude Code ao trabalhar com código neste repositório.

## Visão Geral do Projeto

**BSI Sistemas Automação** é um site de portfólio estático para apresentar soluções de automação industrial para indústria de alimentos. O site é hospedado no GitHub Pages com domínio customizado.

- **Tipo:** Site estático (HTML/CSS/JS puro)
- **Hosting:** GitHub Pages
- **Domínio:** bsiautomacao.com.br (configurado em `CNAME`)
- **Deploy:** Push automático em cada commit para a branch `main`

## Estrutura do Projeto

```
├── index.html                              # Design original (654 linhas) — colorido, tradicional
├── index-v2.html                           # Estilo resend.com (preto, serifa) — home
├── sistemas/                               # Uma página por sistema (sistema, processo, branqueador, qualidade, caldeiras)
├── index-x-ai.html                         # Estilo X-AI (~700 linhas) — minimalista, clean
├── CNAME                                   # Domínio customizado
├── README.md                               # Instruções de deployment
├── .gitignore                              # Configuração git
└── assets/
    ├── qualidade-app-standalone.html       # Demo interativa do módulo de qualidade
    ├── resend.css                          # CSS compartilhado por index-v2.html e sistemas/*.html
    └── telas/                              # Capturas de tela usadas nas páginas de sistema
```

### Três Variações de Design

**1. index.html** — Design Original
- Cores: Azul (#1e40af), verde, laranja, cinzas
- Layout: Cards com borders coloridos, gradientes
- Mobile: Responsive com breakpoints
- Melhor para: Comunicar produto técnico com muita informação
- Público: B2B tradicional

**2. index-v2.html** — Estilo resend.com
- Fundo preto (`#000`), texto `#f0f0f0`/`#a1a4a5`, títulos em serifa (Instrument Serif), cartões com borda sutil e cantos de 16px
- Menu igual ao do Resend, sem Pricing/AI/Log in/Get started; itens dos dropdowns ainda a definir (chevrons sem painel)
- Cada cartão do portfólio abre `sistemas/<nome>.html` (descritivo + telas). A seção de Gestão de Qualidade (recursos, rastreabilidade, demo) fica em `sistemas/qualidade.html`, não na home
- Estilos em `assets/resend.css` (compartilhado); as páginas de `sistemas/` são geradas por script e devem ser editadas como HTML estático

**3. index-x-ai.html** — Estilo X-AI (Minimalista)
- Cores: Preto, branco, cinzas (sem cor primária)
- Layout: Tipografia forte, espaçamento generoso
- Mobile: Limpo em todos os tamanhos
- Melhor para: Premium, enterprise, design premium
- Público: C-level, corporativo

### index.html — Seções Principais

O arquivo contém uma estrutura única de página com as seguintes seções:

1. **Header Sticky** (linhas 30-72) — Logo + navegação com scroll suave
   - Links: `#apps`, `#sobre`, `#qualidade`, `#contato`
   - CTA button customizável para contato

2. **Hero Section** (linhas 85-120) — Chamada principal com gradiente azul
   - Título, subtítulo, botões primário/secundário

3. **Apps Portfolio** (seção `#apps`) — Grid 4 colunas de cards
   - Sistema de Produção
   - Sistema de Processo
   - Branqueador
   - Caldeiras (adicionado recentemente)
   - Tags customizáveis por app

4. **Sobre** (seção `#sobre`) — Texto + stack tecnológico
   - Grid 2 colunas (desktop), 1 coluna (mobile)
   - Lista de features com checkmark verde
   - Descrição do stack: Java 21, Spring Boot 3.3, MySQL, Thymeleaf

5. **Números** (seção `.numeros`) — KPIs em grid 4 colunas
   - Redução em recall (70-90%)
   - Rastreabilidade (100%)
   - ROI (3-6M)
   - Apps integrados (4)

6. **Gestão de Qualidade** (seção `#qualidade`) — Novo módulo em destaque
   - Demo interativa: `<iframe src="assets/qualidade-app-standalone.html">`
   - 4 cards de features (não-conformidades, rastreabilidade, checklists, retenção)
   - Link para versão tela cheia

7. **Contato** (seção `#contato`) — Form + informações
   - Form Formspree: `action="https://formspree.io/f/SEU_ID"`
   - Email: bsisistemaautomacao@gmail.com
   - WhatsApp: (11) 99999-9999

8. **Footer** — 3 colunas de links + copyright

### assets/qualidade-app-standalone.html

Demo interativa do módulo de Gestão de Qualidade (27 KB). Contém UI completa para teste das funcionalidades:
- Interface de não-conformidades
- Rastreabilidade de lotes
- Checklists tipados
- Retenção de lote

Está embutida em iframe no index.html e pode ser aberta em tela cheia.

## Customizações Frequentes

### 1. Contato

**Email (linha ~609):**
```html
📧 Email: <strong>bsisistemaautomacao@gmail.com</strong>
```

**WhatsApp (linha ~610):**
```html
📱 WhatsApp: <strong>(11) 99999-9999</strong>
```

**Form Formspree (linha 600):**
```html
<form class="contato-form" action="https://formspree.io/f/SEU_ID" method="POST">
```
Criar conta em https://formspree.io, gerar novo formulário, copiar ID.

### 2. Logo/Header

Logo está em texto (`.logo` class, linha ~47):
```html
<a href="#" class="logo">🏭 BSI Sistemas</a>
```
Pode ser substituído por `<img>` ou emoji diferente.

### 3. Cores

Variáveis CSS no `:root` (linhas 9-18):
```css
--azul: #1e40af;              /* Cor primária */
--azul-claro: #3b82f6;        /* Gradiente hero */
--verde: #10b981;             /* Checkmarks, accent */
--laranja: #f59e0b;           /* Reservado para expansão */
--cinza-*: ...                /* Cinzas de fundo/texto */
```

### 4. Cards de Apps

Grid 4 colunas (`.grid-4` class):
- Cada card = `.card-app`
- Icon (emoji) + h3 + p + tags
- Cor de border esquerda = `--azul`
- Hover: sombra azul + movimento Y

### 5. Versões de Apps

- **Qualidade:** v0.2.9 (linha 552, atualizar manualmente)
- Versões de outros apps mencionadas em seus cards

### 6. Números KPI

Editar em `.numeros-content` (linhas 530-548):
```html
<div class="numero-box">
  <h3>70-90%</h3>
  <p>Redução em recall</p>
</div>
```

## Desenvolvimento Local

```bash
# Apenas abrir no navegador
open index.html

# Ou servir localmente (Python 3)
python3 -m http.server 8000
# Acessar: http://localhost:8000

# Ou com Live Server (VS Code extension)
# Usar a extensão "Live Server" do VS Code
```

Não há build step ou transpilação — é HTML/CSS/JS puro.

### Testing Visual

Verificar:
- Links de navegação (scroll suave funciona?)
- Form Formspree (submissão envia email?)
- Responsividade mobile (viewport: max-width 768px)
- Demo interativa carrega (iframe acessível?)
- Hover states em cards e botões

## Deploy

Deploy é automático ao fazer push para `main`:

```bash
git add .
git commit -m "feat: descrição da mudança"
git push origin main

# Site ativo em https://bsiautomacao.com.br em ~30s
```

GitHub Pages publica automaticamente da branch `main`.

## Considerações Técnicas

### Performace
- Arquivo único `index.html` (654 linhas) — rápido
- CSS inline (sem arquivo .css separado)
- JS mínimo (apenas smooth scroll)
- Assets: só um iframe (demo qualidade)

### Acessibilidade
- Sem validação a priori — campos form têm `required`
- Scrolling suave com `target.scrollIntoView({ behavior: 'smooth' })`
- Cores contrastadas (azul escuro #1e40af em branco)
- Media queries para mobile (máximo 2 breakpoints)

### SEO
- Title customizado (linha 6)
- Meta description (linha 7) — atualizar conforme mudanças
- OG tags: não presentes (adicionar se compartilhar em redes)

### Formspree
- Form action aponta para `https://formspree.io/f/SEU_ID`
- Substituir `SEU_ID` com ID real da conta Formspree
- Emails são enviados automaticamente para account owner

## Escolhendo Entre as Três Versões

### Decisão Rápida

| Situação | Use | Razão |
|---|---|---|
| Primeira visita / teste | `index.html` | Original, estável |
| Pitch para investors/founders | `index-v2.html` | Visual escuro estilo resend.com |
| Pitch para C-level/enterprise | `index-x-ai.html` | Minimalista, premium |
| Trade show / PDF | `index-x-ai.html` | Preto/branco imprime bem |

### Como Testar Localmente

```bash
# Servir todas as versões
python3 -m http.server 8000

# Depois visitar:
# http://localhost:8000/index.html
# http://localhost:8000/index-v2.html
# http://localhost:8000/index-x-ai.html
```

### Customizações por Versão

#### index.html
- Cores: `:root` CSS variables (linhas 9-18)
- Email/WhatsApp: Procure por "bsisistemaautomacao@gmail.com" (linha ~609)
- Form Formspree: linha 600

#### index-v2.html
- Cores/tipografia: `:root` em `assets/resend.css`
- Menu: `<ul class="nav">` no `<header>` (repetido em cada página de `sistemas/`)
- Cartões do portfólio: `<div class="cards">` em `#apps`; `.preview` recebe imagem de `assets/telas/`
- Conteúdo de cada sistema: `sistemas/*.html`. Só `qualidade.html` tem telas reais; Sistema, Branqueador e Caldeiras mostram aviso "em preparação"

#### index-x-ai.html
- Cores: `:root` CSS variables (linhas 9-15, **sem cor primária**)
- Adicionar cor primária: mude `--azul: #1e40af` e use em `.feature-item` border
- Typography: mudar `--preto` para cinza escuro (`#1a1a1a`) para softer
- Footer: pode adicionar social links em `.footer-socials`

## Deploy por branch

O GitHub Pages publica UMA branch, escolhida em Settings > Pages. Hoje: `v2/resend-style`, onde `index.html` é o `index-v2.html` da main (`git show main:index-v2.html > index.html`), mais `assets/` e `sistemas/`. Ao mudar o design, atualizar a main e a branch publicada e conferir com `git show <branch>:index.html`. Outras branches: `v1/original`, `redesign/x-ai-style`.

## Próximas Melhorias Sugeridas

1. **OG Tags** para compartilhamento em redes sociais (todas as 3 versões)
2. **Favicon** (adicionar `<link rel="icon">`)
3. **Analytics** (Google Analytics ou similar)
4. **Dark Mode** (CSS media query `prefers-color-scheme`)
5. **Internacionalização** (PT-BR vs EN toggle)
6. **A/B Testing** — rodar experiência entre as 3 versões para ver qual converte melhor
7. **Performance** — minificar CSS, usar WebP para imagens
