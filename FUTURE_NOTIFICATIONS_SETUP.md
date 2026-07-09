# Implementação de Notificações Push em Background (FCM)

Este documento contém o código e as instruções para ativar as notificações push que funcionam com o app fechado. Isso requer o plano **Blaze** do Firebase.

## 1. Pré-requisitos
1. Acesse o [Console do Firebase](https://console.firebase.google.com/project/ecossistema-nep/usage/details).
2. Atualize o plano para **Blaze** (Pay as you go).
3. Ative a API **Cloud Functions** e **Cloud Build API** no Google Cloud Console se solicitado durante o deploy.

## 2. Código das Funções

### `functions/package.json`
```json
{
  "name": "functions",
  "description": "Cloud Functions for NEP Delivery Control",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^11.5.0",
    "firebase-functions": "^4.3.1"
  },
  "private": true
}
```

### `functions/index.js`
Esta função monitora a coleção `notifications` e envia o push via FCM.

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onNotificationCreated = functions.firestore
  .document("notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const payload = {
      notification: {
        title: notification.titulo || "Nova Notificação",
        body: notification.mensagem || "Você tem uma nova mensagem",
        icon: "https://ecossistema-nep.web.app/icons/icon-192x192.png",
      },
      data: {
        url: "/?module=" + (notification.referencia_tipo === "aviso" ? "announcements" : "dashboard"),
        notificationId: context.params.notificationId,
        type: notification.tipo || "sistema",
      },
    };

    try {
      // 1. Enviar para usuário específico
      if (notification.destinatario_uid && 
          notification.destinatario_uid !== "ALL" && 
          !["ADMIN","GERENTE","COORDENADOR","ANALISTA","MONITOR","SUPERINTENDENTE"].includes(notification.destinatario_uid)) {
        
        const doc = await admin.firestore().collection("push_subscriptions").doc(notification.destinatario_uid).get();
        if (doc.exists && doc.data().token) {
          await admin.messaging().send({
            token: doc.data().token,
            notification: payload.notification,
            data: payload.data
          });
          console.log("Notification sent to user:", notification.destinatario_uid);
        }
        return;
      }

      // 2. Broadcast (Todos ou Cargos)
      let tokens = [];

      if (notification.destinatario_uid === "ALL") {
        const snapshot = await admin.firestore().collection("push_subscriptions").get();
        snapshot.forEach(doc => {
          if (doc.data().token) tokens.push(doc.data().token);
        });
      } else {
        // Envio por tópico (se implementado no cliente) ou fallback para broadcast filtrado
        // Para simplificar, neste MVP enviamos para tópicos baseados no cargo
        const topic = notification.destinatario_uid.toLowerCase();
        try {
            await admin.messaging().send({
                topic: topic,
                notification: payload.notification,
                data: payload.data
            });
            console.log("Notification sent to topic:", topic);
            return;
        } catch(e) {
            console.warn("Topic send failed", e);
        }
      }

      // Envio Multicast (se necessário broadcast manual)
      if (tokens.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            await admin.messaging().sendEachForMulticast({
                tokens: batch,
                notification: payload.notification,
                data: payload.data
            });
        }
      }

    } catch (error) {
      console.error("Error sending notification:", error);
    }
  });
```

## 3. Configuração do Deploy
Quando estiver pronto para ativar, edite o arquivo `firebase.json` na raiz do projeto e adicione a seção `functions`:

```json
{
  "hosting": { ... },
  "firestore": { ... },
  "functions": {
    "source": "functions"
  }
}
```

## 4. Como fazer o Deploy
Execute no terminal:
```bash
firebase deploy --only functions
```
