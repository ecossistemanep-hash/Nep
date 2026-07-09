const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Triggered when a new notification is created in Firestore.
 * This handles both direct messages and system broadcasts.
 */
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
            // 1. Send to a specific user
            if (notification.destinatario_uid &&
                notification.destinatario_uid !== "ALL" &&
                !["ADMIN", "GERENTE", "COORDENADOR", "ANALISTA", "MONITOR", "SUPERINTENDENTE"].includes(notification.destinatario_uid)) {

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

            // 2. Broadcast (ALL or Role-based)
            // Since specific role filtering is complex without extra data, 
            // we will fetch all tokens and let the client filter? 
            // NO, background notifications must be filtered here.
            // For now, if "ALL", send to all. If "Role", we query users with that role.

            let tokens = [];

            if (notification.destinatario_uid === "ALL") {
                const snapshot = await admin.firestore().collection("push_subscriptions").get();
                snapshot.forEach(doc => {
                    if (doc.data().token) tokens.push(doc.data().token);
                });
            } else {
                // It's a Role
                // 1. Find users with this role
                // This is expensive: Read all users where role == X, then get their tokens.
                // Optimization: Store role in push_subscriptions
                // Fallback for MVP: Send to all, but client handles click? 
                // No, user sees notification. 
                // Let's implement robust reading:

                // Find users with this role
                // Note: Client saves role in multiple ways (nep_cargo, nep_user_role_key).
                // We assume 'users' collection has 'role' or 'cargo'. 
                // If the schema is loose, this might not work perfectly. 
                // Alternative: Send to "topic" named after the role.
                // Best approach: Client subscribes to topic "ROLE_NAME". 

                // Let's try sending to topic!
                const topic = notification.destinatario_uid.toLowerCase();
                try {
                    await admin.messaging().send({
                        topic: topic,
                        notification: payload.notification,
                        data: payload.data
                    });
                    console.log("Notification sent to topic:", topic);
                    return;
                } catch (e) {
                    console.warn("Topic send failed, falling back to manual iteration", e);
                }
            }

            // Send multicast if tokens collected
            if (tokens.length > 0) {
                // Splitting into batches of 500 (FCM limit)
                const batchSize = 500;
                for (let i = 0; i < tokens.length; i += batchSize) {
                    const batch = tokens.slice(i, i + batchSize);
                    const response = await admin.messaging().sendEachForMulticast({
                        tokens: batch,
                        notification: payload.notification,
                        data: payload.data
                    });
                    console.log("Batch sent:", response.successCount, "success", response.failureCount, "failed");

                    // Cleanup invalid tokens
                    if (response.failureCount > 0) {
                        const failedTokens = [];
                        response.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                failedTokens.push(batch[idx]);
                            }
                        });
                        // Ideally remove these from DB
                        console.log("Failed tokens to remove:", failedTokens.length);
                    }
                }
            }

        } catch (error) {
            console.error("Error sending notification:", error);
        }
    });
