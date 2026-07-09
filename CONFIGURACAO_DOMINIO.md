# 🌐 Configuração do Domínio - Ecossistema NEP

> **Domínio:** ecossistemanep.com.br  
> **Firebase Hosting:** ecossistema-nep.web.app  
> **Data da configuração:** 03/01/2026

---

## ✅ O que foi configurado

### Firebase Console
- Domínio personalizado adicionado ao projeto `ecossistema-nep`
- SSL automático habilitado (certificado HTTPS gratuito)

### Registro.br - Zona DNS
| Tipo | Nome | Valor |
|------|------|-------|
| **A** | ecossistemanep.com.br | `199.36.158.100` |
| **TXT** | ecossistemanep.com.br | `hosting-site-ecossistema-nep` |

---

## 🔗 URLs do Sistema

| Ambiente | URL |
|----------|-----|
| Firebase (original) | https://ecossistema-nep.web.app |
| Domínio personalizado | https://ecossistemanep.com.br |

Ambas as URLs mostram o **mesmo conteúdo**.

---

## 🛡️ Painel Administrativo

O Admin possui **6 abas** de controle:

| Aba | Funcionalidade |
|-----|----------------|
| 📊 Dashboard | Analytics 360° - Acessos, usuários ativos, módulo mais usado |
| 👥 Usuários | CRUD de usuários (criar, editar, ativar/desativar, excluir) |
| 🔐 Permissões | MIME - Ativar/desativar módulos por cargo |
| 📋 Auditoria | Logs de ações administrativas |
| 📑 Temporadas | Gestão de temporadas do Podcast |
| ⚙️ Configurações | Parâmetros do sistema |

### Sistema MIME (Permissões)
- Toggle global para ativar/desativar módulos
- Checkboxes para definir acesso por cargo
- Módulos bloqueados mostram "Módulo Indisponível"

### Analytics 360°
- Tracking automático de todos os acessos
- Visualização de quem acessou o quê
- Identificação de módulos sem uso

---

## 🚀 Como fazer Deploy

### Pré-requisitos
- Node.js instalado
- Firebase CLI: `npm install -g firebase-tools`

### Passo a Passo

**1. Desconectar conta anterior (se necessário)**
```cmd
firebase logout
```

**2. Conectar na conta correta**
```cmd
firebase login
```

**3. Navegar para a pasta do projeto**
```cmd
cd c:\Users\Fernando\.gemini\antigravity\scratch\EcossistemaNEP
```

**4. Fazer o deploy**
```cmd
firebase deploy --only hosting
```

O conteúdo atualiza automaticamente em ambos os endereços.

---

## 🔧 Acessos Importantes

### Firebase Console
- **URL:** https://console.firebase.google.com
- **Projeto:** ecossistema-nep
- **Seção:** Hosting → Domínios personalizados

### Registro.br
- **URL:** https://registro.br
- **Domínio:** ecossistemanep.com.br
- **Seção:** DNS → Configurar zona DNS

### Credenciais Admin
- **Email:** fernando.pevangelista@gmail.com
- **Acesso:** Painel Admin (aba Sistema na sidebar)

---

## ❓ Problemas Comuns

### Site não abre pelo domínio
1. Verifique se a propagação DNS terminou (pode levar até 24h)
2. Acesse Firebase Console → Hosting → Verificar domínio
3. Confirme os registros no Registro.br

### Erro de certificado SSL
- O Firebase gera o certificado automaticamente após a verificação DNS
- Pode levar alguns minutos após o domínio ser verificado

### Erro "Executable files are forbidden"
- Adicione arquivos executáveis ao `ignore` em `firebase.json`
- Já configurado para ignorar: `.exe`, `.bat`, `.sh`, `.cmd`, `.ps1`, `.dll`

### Erro "Not in a Firebase app directory"
- Verifique se existem os arquivos `firebase.json` e `.firebaserc` na pasta

---

## 📞 Suporte

- **Firebase:** https://firebase.google.com/support
- **Registro.br:** https://registro.br/ajuda
