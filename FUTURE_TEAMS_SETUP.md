# Integração Futura: Calendário Teams (Microsoft Graph)

Este documento contém as instruções para conectar o **Calendário do Sistema** com a conta Microsoft Teams/Outlook real da empresa.

## 1. Configuração no Azure Portal (Responsabilidade de TI)
1.  Acesse [portal.azure.com](https://portal.azure.com).
2.  Vá em **Azure Active Directory** > **App registrations** > **New registration**.
3.  Nome: `NEP Delivery Control`.
4.  Supported account types: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`.
5.  Redirect URI (SPA):
    *   `https://ecossistema-nep.web.app`
    *   `http://localhost:5000` (para testes locais)
6.  Após criar, copie o **Application (client) ID** e o **Directory (tenant) ID**.
7.  Em **API Permissions**, adicione a permissão `Calendars.Read` (Microsoft Graph).

## 2. Implementação do Código

### A. Adicionar Biblioteca MSAL
No arquivo `index.html`, adicione antes dos scripts principais:
```html
<script src="https://alcdn.msauth.net/browser/2.30.0/js/msal-browser.min.js"></script>
```

### B. Atualizar `js/teams-calendar.js`
Substitua o conteúdo atual pelo código abaixo, preenchendo o `YOUR_CLIENT_ID`.

```javascript
const msalConfig = {
    auth: {
        clientId: "SEU_CLIENT_ID_AQUI", // <--- PREENCHER AQUI
        authority: "https://login.microsoftonline.com/common", // Ou seu Tenant ID
        redirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphEventsEndpoint: "https://graph.microsoft.com/v1.0/me/events"
};

const NexusTeamsCalendar = {
    msalInstance: null,
    
    async init() {
        this.msalInstance = new msal.PublicClientApplication(msalConfig);
    },

    async signIn() {
        try {
            const loginRequest = { scopes: ["User.Read", "Calendars.Read"] };
            await this.msalInstance.loginPopup(loginRequest);
            NexusApp.showToast("Conectado com sucesso!", "success");
            this.renderCalendar(); // Recarrega com dados reais
        } catch (error) {
            console.error(error);
            NexusApp.showToast("Erro ao conectar.", "error");
        }
    },

    async fetchEvents() {
        // Tenta pegar token silenciosamente
        const account = this.msalInstance.getAllAccounts()[0];
        if (!account) return []; // Retorna vazio se não logado

        try {
            const response = await this.msalInstance.acquireTokenSilent({
                scopes: ["Calendars.Read"],
                account: account
            });

            const headers = new Headers();
            const bearer = `Bearer ${response.accessToken}`;
            headers.append("Authorization", bearer);

            const options = {
                method: "GET",
                headers: headers
            };
            
            const graphResponse = await fetch(graphConfig.graphEventsEndpoint, options);
            const data = await graphResponse.json();
            
            // Mapeia para o formato do nosso calendário
            return data.value.map(evt => ({
                id: evt.id,
                title: evt.subject,
                start: new Date(evt.start.dateTime),
                end: new Date(evt.end.dateTime),
                type: 'meeting', // Simplificação
                organizer: evt.organizer.emailAddress.name
            }));

        } catch (error) {
            console.error("Erro ao buscar eventos", error);
            return [];
        }
    }
    
    // ... Restante do código de renderização UI mantém-se igual
};
```

## 3. Próximos Passos
Quando tiver as credenciais:
1.  Edite `index.html` e adicione o script.
2.  Edite `js/teams-calendar.js` e implemente a lógica acima.
3.  Preencha o `clientId` no código.
