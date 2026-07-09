
// Seed script to be run in the browser console or via a temporary HTML file
async function seedUpdates() {
    const db = firebase.firestore();
    const batch = db.batch();

    const updates = [
        {
            type: 'feature',
            version: '2.1.0',
            title: 'Nova Página de Status & Changelog',
            description: 'Agora você pode acompanhar todas as novidades, correções e melhorias do sistema em tempo real através da nossa nova página de status pública.\n\nAcesse a qualquer momento para ver o que há de novo!',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            type: 'feature',
            version: '2.1.0',
            title: 'Sistema de Feedback Integrado',
            description: 'Adicionamos um novo botão de feedback na barra superior (ícone 💬).\n\nAgora você pode reportar bugs, solicitar melhorias ou enviar sugestões diretamente pelo sistema, sem precisar sair da tela que está usando.',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            type: 'improvement',
            version: '2.0.5',
            title: 'Melhorias no Módulo de Depoimentos',
            description: 'Aprimoramos a gestão de depoimentos com novas opções de exclusão para administradores e fluxo de aprovação mais fluido.',
            createdAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000)) // Ontem
        },
        {
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            type: 'feature',
            version: '2.1.0',
            title: 'Kanban: Novos Filtros e Auditoria',
            description: '• Seletor de Visualizadores: Busca em tempo real e chips visuais.\n• Histórico de Atividades: Timeline completa no card (quem fez o quê e quando).\n• Novos Filtros: Prioridade, Solicitante e Prazo.\n• Arquivamento Rápido: Botão direto no card 📦.',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            type: 'improvement',
            version: '2.1.0',
            title: 'Kanban: Notificações 2.0',
            description: '9 novos gatilhos de notificação para manter todos alinhados:\n• Criação, Edição e Movimentação\n• Entrega, Aprovação e Rejeição\n• Arquivamento\n\nAgora visualizadores também são notificados!',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            type: 'fix',
            version: '1.2.0',
            title: 'Correções no Módulo de Depoimentos',
            description: '• Resolvido erro de permissão ao aprovar/rejeitar depoimentos.\n• Rejeição agora arquiva em vez de deletar (auditável).\n• Adicionado botão de exclusão permanente para admins.\n• Regras de segurança atualizadas.',
            createdAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000)) // Ontem
        },
        {
            type: 'fix',
            version: '2.1.1',
            title: 'Correção Crítica: Rotina Administrativa',
            description: 'Resolvido problema onde as demandas da rotina administrativa não estavam sendo salvas. Agora o progresso é sincronizado na nuvem e não se perde.',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }
    ];

    // Get existing updates to prevent duplicates
    const snapshot = await db.collection('status_updates').get();
    const existingTitles = new Set(snapshot.docs.map(doc => doc.data().title));

    let addedCount = 0;

    for (const update of updates) {
        if (!existingTitles.has(update.title)) {
            const ref = db.collection('status_updates').doc();
            batch.set(ref, update);
            addedCount++;
        }
    }

    if (addedCount > 0) {
        await batch.commit();
        console.log(`${addedCount} updates seeded!`);
        alert(`${addedCount} novas atualizações adicionadas com sucesso!`);
    } else {
        console.log('No new updates to seed.');
        alert('Todas as atualizações já estavam cadastradas!');
    }
}

// Expose to window so we can call it
window.seedUpdates = seedUpdates;
