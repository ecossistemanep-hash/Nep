# 🛡️ Guia de Correção: Regras de Segurança Firebase

Este guia explica como substituir as regras de teste (que expiraram) por regras definitivas que permitem o funcionamento do sistema com segurança.

## 🚨 O Problema
O Firebase estava em "Modo de Teste", que permite acesso total por 30 dias. Esse prazo acabou, bloqueando o acesso de todos (inclusive o seu).

## ✅ A Solução
Vamos configurar regras que dozem: *"Apenas usuários logados podem acessar os dados"*.

---

## Passo a Passo

### 1. Acesse o Console do Firebase
1. Abra o navegador e vá para [console.firebase.google.com](https://console.firebase.google.com).
2. Selecione o projeto **"Janus System"** (ou Ecossistema NEP).

### 2. Vá para o Firestore Database
1. No menu lateral esquerdo, clique em **Criação** (Build) > **Firestore Database**.
2. No painel principal, clique na aba **Regras** (Regras).

### 3. Substitua as Regras
Você verá um código que tem uma data de validade (ex: `allow read, write: if request.time < timestamp.date(2026, 1, 17);`).

1. **Apague todo o código** que está lá.
2. **Copie e cole** o novo código abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Função auxiliar: Verifica se o usuário está logado
    function isAuthenticated() {
      return request.auth != null;
    }

    // Regra Geral: Tudo no sistema exige login
    // Isso libera: Users, Tasks, Agendas, Forum, Points
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

> **Nota Técnica:** O código acima é uma versão simplificada e robusta que libera o acesso para qualquer usuário autenticado no seu app. Como seu app é focado em uso interno corporativo, isso serve perfeitamente para produção.

### 4. Publique
1. Clique no botão **Publicar** (Publish).
2. Aguarde alguns segundos (pode levar até 1 minuto para propagar).

### 5. Teste
1. Volte para o Ecossistema NEP.
2. Tente fazer login novamente.
3. O erro deve ter desaparecido! 🎉

---

## 🆘 Ainda com problemas?
Se mesmo após publicar as regras o erro persistir:
1. Verifique se copiou o código corretamente.
2. Tente limpar o cache do navegador (Ctrl + F5).
3. Me avise para investigarmos logs específicos.
