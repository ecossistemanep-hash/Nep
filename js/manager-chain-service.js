/* =========================================
   NEP MANAGER CHAIN SERVICE
   Mantém "cadeia_gestores" (array de uids de todos os gestores acima de
   um usuário, do direto ao topo) em cada doc de users/{uid}.

   Por quê: o Report Executivo (app irmão portado) enxerga hierarquia
   recursiva (um diretor vê toda a árvore abaixo dele, não só 1 nível).
   Firestore Rules não expressam recursão/grafo sem Cloud Function paga
   (fora do plano Spark). A saída sem custo é desnormalizar: gravar em
   cada usuário a lista já resolvida de ancestrais, recalculada aqui
   sempre que um gestor_uid muda em qualquer ponto da árvore.
   ========================================= */

const ManagerChainService = {
  MAX_DEPTH: 12, // proteção contra ciclo acidental de gestor_uid

  db() {
    return window.db || (typeof firebase !== 'undefined' ? firebase.firestore() : null);
  },

  async _loadAllUsers() {
    const db = this.db();
    const snap = await db.collection('users').get();
    const byUid = {};
    snap.docs.forEach(d => { byUid[d.id] = { uid: d.id, ...d.data() }; });
    return byUid;
  },

  _computeChain(uid, byUid) {
    const chain = [];
    const seen = new Set([uid]);
    let current = byUid[uid]?.gestor_uid;
    while (current && byUid[current] && !seen.has(current) && chain.length < this.MAX_DEPTH) {
      chain.push(current);
      seen.add(current);
      current = byUid[current]?.gestor_uid;
    }
    return chain;
  },

  _findDescendants(uid, byUid) {
    const children = Object.values(byUid).filter(u => u.gestor_uid === uid).map(u => u.uid);
    const all = [...children];
    children.forEach(c => { all.push(...this._findDescendants(c, byUid)); });
    return all;
  },

  // Recalcula a cadeia do próprio usuário e, em cascata, de todos os seus
  // subordinados (a cadeia deles também muda quando a de um gestor acima
  // muda). Chamar sempre logo após gravar um novo gestor_uid.
  async recomputeChain(uid) {
    const db = this.db();
    if (!db || !uid) return;
    try {
      const byUid = await this._loadAllUsers();
      const affected = [uid, ...this._findDescendants(uid, byUid)];
      const batch = db.batch();
      affected.forEach(u => {
        const chain = this._computeChain(u, byUid);
        batch.update(db.collection('users').doc(u), { cadeia_gestores: chain });
      });
      await batch.commit();
      console.log(`[ManagerChain] Cadeia recalculada para ${affected.length} usuário(s).`);
    } catch (e) {
      console.error('[ManagerChain] Erro ao recalcular cadeia de gestores:', e);
    }
  }
};

window.ManagerChainService = ManagerChainService;
