/**
 * NEP DELIVERY CONTROL - PWA Manager
 * Gerencia instalação PWA e Push Notifications
 */

const NexusPWA = {
    deferredPrompt: null,
    swRegistration: null,
    isInstalled: false,
    pushPermission: 'default',

    // =========================================
    // INITIALIZATION
    // =========================================
    async init() {
        console.log('[PWA] Initializing...');

        // Check if already installed
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;

        // Register Service Worker
        await this.registerServiceWorker();

        // Listen for install prompt
        this.listenForInstallPrompt();

        // Check push notification support
        this.checkPushSupport();

        // Show install banner if not installed
        if (!this.isInstalled) {
            setTimeout(() => this.showInstallBanner(), 5000);
        }

        console.log('[PWA] Initialized. Installed:', this.isInstalled);
    },

    // =========================================
    // SERVICE WORKER REGISTRATION
    // =========================================
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA] Service Worker not supported');
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            this.swRegistration = registration;
            console.log('[PWA] Service Worker registered:', registration.scope);

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateBanner();
                    }
                });
            });

            // Tentar descobrir atualizações ativamente ao iniciar
            if (navigator.serviceWorker.controller) {
                registration.update();
            }

            return registration;
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
            return null;
        }
    },

    // =========================================
    // INSTALL PROMPT
    // =========================================
    listenForInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] Install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed');
            this.isInstalled = true;
            this.deferredPrompt = null;
            this.hideInstallBanner();

            if (window.NexusApp) {
                NexusApp.showToast('App instalado com sucesso! 🎉', 'success');
            }
        });
    },

    async promptInstall() {
        if (!this.deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return false;
        }

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;

        console.log('[PWA] Install prompt outcome:', outcome);
        this.deferredPrompt = null;

        return outcome === 'accepted';
    },

    // =========================================
    // PUSH NOTIFICATIONS
    // =========================================
    checkPushSupport() {
        if (!('PushManager' in window)) {
            console.warn('[PWA] Push notifications not supported');
            this.pushPermission = 'unsupported';
            return false;
        }

        this.pushPermission = Notification.permission;
        return true;
    },

    async requestPushPermission() {
        if (!('Notification' in window)) {
            console.warn('[PWA] Notifications not supported');
            return 'unsupported';
        }

        if (Notification.permission === 'granted') {
            this.pushPermission = 'granted';
            await this.subscribeToPush();
            return 'granted';
        }

        if (Notification.permission === 'denied') {
            this.pushPermission = 'denied';
            return 'denied';
        }

        const permission = await Notification.requestPermission();
        this.pushPermission = permission;

        if (permission === 'granted') {
            await this.subscribeToPush();
        }

        return permission;
    },

    async subscribeToPush() {
        if (!window.messaging) {
            console.warn('[PWA] Messaging not supported');
            return null;
        }

        try {
            // Get FCM Token
            const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

            const currentToken = await window.messaging.getToken({
                vapidKey: vapidPublicKey
            });

            if (currentToken) {
                console.log('[PWA] FCM Token Received');
                await this.saveSubscription(currentToken);

                // Listener for foreground messages
                window.messaging.onMessage((payload) => {
                    console.log('[PWA] Foreground message:', payload);
                    // PWA is open, show toast instead of notification
                    if (window.NexusApp) {
                        NexusApp.showToast(`🔔 ${payload.notification.title}: ${payload.notification.body}`, 'info');
                    }
                    // Or show local notification if desired
                    // this.showLocalNotification(payload.notification.title, { ... });
                });

                return currentToken;
            } else {
                console.log('[PWA] No registration token available. Request permission to generate one.');
                return null;
            }
        } catch (error) {
            console.error('[PWA] Push subscription failed:', error);
            return null;
        }
    },

    async saveSubscription(token) {
        // Save to Firestore for server-side push
        if (!window.db || !window.NexusAuthService?.currentUser) {
            console.warn('[PWA] Cannot save subscription - not authenticated');
            return;
        }

        const uid = window.NexusAuthService.currentUser.uid;
        const role = localStorage.getItem('nep_user_role_key') || 'unknown';

        try {
            await window.db.collection('push_subscriptions').doc(uid).set({
                token: token,
                role: role,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userAgent: navigator.userAgent
            }, { merge: true });

            console.log('[PWA] FCM Token saved to Firestore');
        } catch (error) {
            console.error('[PWA] Failed to save subscription:', error);
        }
    },

    // =========================================
    // LOCAL NOTIFICATIONS (fallback)
    // =========================================
    async showLocalNotification(title, options = {}) {
        if (Notification.permission !== 'granted') {
            console.warn('[PWA] Notification permission not granted');
            return;
        }

        const defaultOptions = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            tag: 'nep-local-notification',
            requireInteraction: false
        };

        const finalOptions = { ...defaultOptions, ...options };

        if (this.swRegistration) {
            await this.swRegistration.showNotification(title, finalOptions);
        } else {
            new Notification(title, finalOptions);
        }
    },

    // =========================================
    // UI COMPONENTS
    // =========================================
    showInstallBanner() {
        if (this.isInstalled || document.getElementById('pwa-install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-banner animate-fade-in-up';
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">
                    <i class="fa-solid fa-mobile-screen"></i>
                </div>
                <div class="pwa-banner-text">
                    <strong>Instale o NEP</strong>
                    <span>Acesse mais rápido direto da sua tela inicial</span>
                </div>
                <div class="pwa-banner-actions">
                    <button class="pwa-btn-install" onclick="NexusPWA.promptInstall()">
                        <i class="fa-solid fa-download"></i> Instalar
                    </button>
                    <button class="pwa-btn-close" onclick="NexusPWA.hideInstallBanner()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
    },

    hideInstallBanner() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.add('animate-fade-out');
            setTimeout(() => banner.remove(), 300);
        }
    },

    showInstallButton() {
        // Removed - Install button now only appears in profile preferences
        // and in the floating banner after 30 seconds
        console.log('[PWA] Install available - user can install via profile preferences');
    },

    showUpdateBanner() {
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.className = 'pwa-banner pwa-update animate-fade-in-up';
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">
                    <i class="fa-solid fa-rotate"></i>
                </div>
                <div class="pwa-banner-text">
                    <strong>Nova versão disponível!</strong>
                    <span>Atualize para ter as últimas melhorias</span>
                </div>
                <div class="pwa-banner-actions">
                    <button class="pwa-btn-install" onclick="NexusPWA.updateApp()">
                        <i class="fa-solid fa-sync"></i> Atualizar
                    </button>
                    <button class="pwa-btn-close" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
    },

    updateApp() {
        const btn = document.querySelector('.pwa-btn-install');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Limpando cache...';

        if (this.swRegistration && this.swRegistration.waiting) {
            this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Limpar caches locais forçadamente antes de recarregar
        if ('caches' in window) {
            caches.keys().then((names) => {
                Promise.all(names.map(name => caches.delete(name)))
                    .then(() => {
                        console.log('[PWA] Todos os caches do Service Worker foram apagados');
                        // Tentar forçar reload completo bypassando cache local
                        window.location.href = window.location.pathname + '?v=' + new Date().getTime();
                    });
            });
        } else {
            window.location.reload(true);
        }
    },

    // =========================================
    // NOTIFICATION PERMISSION PROMPT
    // =========================================
    showNotificationPrompt() {
        if (this.pushPermission === 'granted' || this.pushPermission === 'denied') return;
        if (document.getElementById('pwa-notification-prompt')) return;

        const prompt = document.createElement('div');
        prompt.id = 'pwa-notification-prompt';
        prompt.className = 'pwa-notification-prompt animate-fade-in';
        prompt.innerHTML = `
            <div class="pwa-prompt-content">
                <div class="pwa-prompt-icon">
                    <i class="fa-solid fa-bell"></i>
                </div>
                <div class="pwa-prompt-text">
                    <h4>Ativar Notificações?</h4>
                    <p>Receba alertas de novas tarefas, mensagens e atualizações importantes.</p>
                </div>
                <div class="pwa-prompt-actions">
                    <button class="pwa-btn-allow" onclick="NexusPWA.handleNotificationResponse(true)">
                        <i class="fa-solid fa-check"></i> Permitir
                    </button>
                    <button class="pwa-btn-deny" onclick="NexusPWA.handleNotificationResponse(false)">
                        Agora não
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(prompt);
    },

    async handleNotificationResponse(allow) {
        const prompt = document.getElementById('pwa-notification-prompt');
        if (prompt) {
            prompt.classList.add('animate-fade-out');
            setTimeout(() => prompt.remove(), 300);
        }

        if (allow) {
            const permission = await this.requestPushPermission();
            if (permission === 'granted' && window.NexusApp) {
                NexusApp.showToast('Notificações ativadas! 🔔', 'success');
            }
        }
    },

    // =========================================
    // UTILITIES
    // =========================================
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    },

    // Get installation status for debugging
    getStatus() {
        return {
            isInstalled: this.isInstalled,
            hasServiceWorker: !!this.swRegistration,
            pushPermission: this.pushPermission,
            canInstall: !!this.deferredPrompt
        };
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NexusPWA.init());
} else {
    NexusPWA.init();
}

// Expose globally
window.NexusPWA = NexusPWA;
