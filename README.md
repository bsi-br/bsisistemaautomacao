# BSI Sistemas Automação

Site profissional da BSI com portfolio de apps: Sistema, Processo, Branqueador e Gestão de Qualidade.

## Deploy rápido:

```bash
# 1. Crie o repo em github.com/bsi-br/bsisistemaautomacao
# 2. Clone
git clone https://github.com/bsi-br/bsisistemaautomacao.git
cd bsisistemaautomacao

# 3. Copie os arquivos deste template pra lá
# 4. Execute:
git add .
git commit -m "feat: site inicial - automação industrial"
git push -u origin main

# 5. Ativa Pages em Settings → Pages → main branch
# 6. Aponta domínio no registrador
```

## Estrutura

```
├── index.html                 # Home
├── CNAME                      # Domínio
├── README.md                  # Este arquivo
└── assets/
    └── qualidade-app-standalone.html  # App demo
```

## Customizar

- Email: mudar em index.html (linha ~330)
- WhatsApp: mudar em index.html (linha ~335)
- Formspree: criar conta em formspree.io e atualizar action do form
