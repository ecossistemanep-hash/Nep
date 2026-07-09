window.migrateSetorToLogos = async function () {
    if (!window.db) {
        console.error("Firebase db not initialized.");
        return;
    }

    try {
        console.log("Iniciando migração de setor para logos no Firestore...");
        const usersSnap = await window.db.collection('users').get();
        let updatedCount = 0;
        let batch = window.db.batch();
        let opCount = 0;

        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const uid = doc.id;

            // Se já tem logos, pula para não sobrescrever
            if (data.logos && Array.isArray(data.logos) && data.logos.length > 0) {
                continue;
            }

            const setor = data.setor;
            let newLogos = [];
            if (setor && typeof setor === 'string' && setor.trim() !== '') {
                newLogos = [setor.trim().toUpperCase()];
            }

            if (newLogos.length > 0) {
                batch.update(window.db.collection('users').doc(uid), { logos: newLogos });
                updatedCount++;
                opCount++;

                // Firebase limits batches to 500 operations
                if (opCount === 450) {
                    await batch.commit();
                    batch = window.db.batch();
                    opCount = 0;
                    console.log(`Commit intermediário de 450 usuários...`);
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        console.log(`Migração concluída! ${updatedCount} usuários tiveram seu campo setor convertido para logos.`);
    } catch (e) {
        console.error("Erro durante a migração:", e);
    }
};
console.log("Script de migração carregado. Execute migrateSetorToLogos() no console como Admin para iniciar.");
