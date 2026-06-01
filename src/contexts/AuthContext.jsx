import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  // Função para criar usuário inicial (apenas para desenvolvimento)
  const createInitialUser = async (user) => {
    try {
      // Verificar se já existem usuários no sistema
      const usuariosRef = collection(db, 'usuarios');
      const snapshot = await getDocs(usuariosRef);
      
      // Se não houver nenhum usuário, criar o admin
      if (snapshot.empty) {
        const adminData = {
          uid: user.uid,
          email: user.email,
          nome: 'Administrador',
          role: 'admin',
          tipo: 'admin',
          ativo: true,
          createdAt: new Date()
        };
        
        await setDoc(doc(db, 'usuarios', user.uid), adminData);
        return adminData;
      } else {
        // Verificar se o usuário atual já existe
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists()) {
          return userDoc.data();
        } else {
          // Usuário autenticado mas não cadastrado - NÃO criar automaticamente
          console.error('Usuário não cadastrado no sistema');
          toast.error('Usuário não autorizado. Contate o administrador.');
          await signOut(auth);
          return null;
        }
      }
    } catch (error) {
      console.error('Erro ao criar/verificar usuário:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        
        if (user) {
          try {
            // Tentar buscar dados do usuário
            const docRef = doc(db, 'usuarios', user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const userDataFromDb = docSnap.data();
              console.log('📋 Dados do usuário carregados:', userDataFromDb);
              console.log('📋 Role do usuário:', userDataFromDb.role);
              console.log('📋 Tipo do usuário:', userDataFromDb.tipo);
              setUserData(userDataFromDb);
            } else {
              console.error('❌ Usuário não encontrado no banco de dados');
              toast.error('Usuário não autorizado. Contate o administrador.');
              await signOut(auth);
              setUserData(null);
            }
          } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            toast.error('Erro ao carregar dados do usuário');
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
      } catch (error) {
        console.error('Erro no auth state change:', error);
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    login,
    logout,
    loading,
    initializing
  };

  return (
    <AuthContext.Provider value={value}>
      {!initializing && children}
    </AuthContext.Provider>
  );
}