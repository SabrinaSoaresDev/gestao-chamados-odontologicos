import admin from "firebase-admin";
import fs from "fs";

// ler o JSON da chave
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function sincronizarUsuarios() {
  try {
    const listUsers = await admin.auth().listUsers(1000);

    for (const user of listUsers.users) {
      const userRef = db.collection("usuarios").doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        await userRef.set({
          uid: user.uid,
          nome: user.displayName || "",
          email: user.email || "",
          role: "tecnico",
          unidade: "",
          telefone: "",
          especialidade: "",
          observacoes: "",
          ativo: true,
          dataCriacao: new Date(),
          criadoPor: "script",
          ultimoAcesso: null
        });

        console.log("✅ Criado:", user.email);
      } else {
        console.log("✔ Já existe:", user.email);
      }
    }

    console.log("🚀 Sincronização finalizada");
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

sincronizarUsuarios();