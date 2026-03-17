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
          // Usuário autenticado mas não cadastrado - criar como dentista padrão
          const newUserData = {
            uid: user.uid,
            email: user.email,
            nome: user.email.split('@')[0] || 'Novo Usuário',
            role: 'dentista', // Papel padrão
            ativo: true,
            createdAt: new Date()
          };
          
          await setDoc(doc(db, 'usuarios', user.uid), newUserData);
          return newUserData;
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
              setUserData(docSnap.data());
            } else {
              // Se não existir, criar usuário inicial
              const newUserData = await createInitialUser(user);
              setUserData(newUserData);
              
              if (newUserData) {
                toast.success('Usuário cadastrado com sucesso!');
              }
            }
          } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            
            // Se for erro de permissão, tentar criar usuário
            if (error.code === 'permission-denied') {
              const newUserData = await createInitialUser(user);
              setUserData(newUserData);
            } else {
              toast.error('Erro ao carregar dados do usuário');
            }
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