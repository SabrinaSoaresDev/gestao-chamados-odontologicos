const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.criarUsuario = functions.https.onCall(async (data, context) => {
  // Verificar se quem chamou está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Você precisa estar logado');
  }

  // Verificar se é admin
  const adminDoc = await admin.firestore()
    .collection('usuarios')
    .doc(context.auth.uid)
    .get();

  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem criar usuários');
  }

  try {
    // 1. Criar usuário no Authentication
    const user = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.nome
    });

    // 2. Criar documento no Firestore
    await admin.firestore().collection('usuarios').doc(user.uid).set({
      uid: user.uid,
      nome: data.nome,
      email: data.email,
      role: data.role,
      ativo: data.ativo,
      telefone: data.telefone || '',
      unidade: data.unidade || '',
      especialidade: data.especialidade || '',
      observacoes: data.observacoes || '',
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
      criadoPor: context.auth.uid,
      ultimoAcesso: null
    });

    return { 
      success: true, 
      uid: user.uid,
      message: 'Usuário criado com sucesso' 
    };

  } catch (error) {
    console.error('Erro:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      throw new functions.https.HttpsError('already-exists', 'Este e-mail já está cadastrado');
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.excluirUsuario = functions.https.onCall(async (data, context) => {
  // Verificar se quem chamou está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Você precisa estar logado');
  }

  // Verificar se é admin
  const adminDoc = await admin.firestore()
    .collection('usuarios')
    .doc(context.auth.uid)
    .get();

  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem excluir usuários');
  }

  try {
    // 1. Excluir do Authentication
    await admin.auth().deleteUser(data.uid);
    
    // 2. Excluir do Firestore
    await admin.firestore().collection('usuarios').doc(data.uid).delete();

    return { 
      success: true, 
      message: 'Usuário excluído com sucesso' 
    };

  } catch (error) {
    console.error('Erro:', error);
    
    if (error.code === 'auth/user-not-found') {
      await admin.firestore().collection('usuarios').doc(data.uid).delete();
      return { 
        success: true, 
        message: 'Usuário excluído do Firestore (não encontrado no Auth)' 
      };
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});