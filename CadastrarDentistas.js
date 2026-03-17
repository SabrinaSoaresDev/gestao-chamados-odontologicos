// Script para cadastrar dentistas no Firebase (com autenticação de admin)
// Execute com: node cadastrarDentistas.js

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import readline from 'readline';

// Configuração do Firebase (substitua com suas credenciais REAIS)
const firebaseConfig = {
  apiKey: "AIzaSyAR9IHJFoeRldf0c8BEKvuK26MT3UIeNbs",
  authDomain: "gestao-chamados-odontologicos.firebaseapp.com",
  projectId: "gestao-chamados-odontologicos",
  storageBucket: "gestao-chamados-odontologicos.firebasestorage.app",
  messagingSenderId: "145169990092",
  appId: "1:145169990092:web:c548d634ccaa5209205d69",
  measurementId: "G-V5SKNDWKP6"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Criar interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Lista de dentistas para cadastrar
const dentistas = [
  {
    nome: "AMABIA JULIARA DE SOUZA COSTA",
    email: "amabia.costa@email.com",
    ubs: "Ubs Perobas",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na Ubs Perobas"
  },
  {
    nome: "ARIANE MIRANDA FERREIRA",
    email: "ariane.ferreira@email.com",
    ubs: "US CAIC",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na US CAIC"
  },
  {
    nome: "CARLA FERREIRA BUFFON",
    email: "carla.buffon@email.com",
    ubs: "USF Shel",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na USF Shel"
  },
  {
    nome: "DANISE FAUSTINI TAQUETI",
    email: "danise.taqueti@email.com",
    ubs: "São José",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende em São José"
  },
  {
    nome: "ELIANE CARLESSO",
    email: "eliane.carlesso@email.com",
    ubs: "Baixo Quartel",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no Baixo Quartel"
  },
  {
    nome: "ELISANGELA TEIXEIRA CRENCE",
    email: "elisangela.crence@email.com",
    ubs: "UBS FARIAS",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS FARIAS"
  },
  {
    nome: "FERNANDA MATTOS",
    email: "fernanda.mattos@email.com",
    ubs: "São Rafael",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende em São Rafael"
  },
  {
    nome: "GRAZIELLA AZEVEDO DONO VIANA",
    email: "graziella.viana@email.com",
    ubs: "USF CONCEIÇÃO",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na USF CONCEIÇÃO"
  },
  {
    nome: "GUILHERME GUIMARÃES GUZZO",
    email: "guilherme.guzzo@email.com",
    ubs: "UBS Residencial Rio Doce",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS Residencial Rio Doce"
  },
  {
    nome: "HELTON ROBERTI BORGES",
    email: "helton.borges@email.com",
    ubs: "U.S.C ÁREA 18",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na U.S.C ÁREA 18"
  },
  {
    nome: "IOHANA ARRUDA BAUDI",
    email: "iohana.baudi@email.com",
    ubs: "PONTAL DO IPIRANGA",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no PONTAL DO IPIRANGA"
  },
  {
    nome: "JANIELLE SILVA DONATO",
    email: "janielle.donato@email.com",
    ubs: "UBS Canivete",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS Canivete"
  },
  {
    nome: "JARDEL DA COSTA DALBEM",
    email: "jardel.dalbem@email.com",
    ubs: "Planalto 37",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no Planalto 37"
  },
  {
    nome: "JOÃO GILBERTO CORREIA CHAGAS",
    email: "joao.chagas@email.com",
    ubs: "Povoação",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na Povoação"
  },
  {
    nome: "JOAO FELIPE SANTOS BREDA",
    email: "joao.breda@email.com",
    ubs: "santa cruz",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende em santa cruz"
  },
  {
    nome: "JOSICARLA DALMAZO BORTOLOTTI",
    email: "josicarla.bortolotti@email.com",
    ubs: "santa cruz",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende em santa cruz"
  },
  {
    nome: "KISSIELI TEOTONIO GOMES",
    email: "kissieli.gomes@email.com",
    ubs: "UBS Japira",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS Japira"
  },
  {
    nome: "LAIS GOMES LOPES",
    email: "lais.lopes@email.com",
    ubs: "UBS- N.ESPERANÇA",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS- N.ESPERANÇA"
  },
  {
    nome: "LIVIA MARIA CANAL DE OLIVEIRA",
    email: "livia.oliveira@email.com",
    ubs: "UBS - BNH",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS - BNH"
  },
  {
    nome: "LIZIANE BUSS WOELFFEL PEDROTI",
    email: "liziane.pedroti@email.com",
    ubs: "UBS LAGOA DO MEIO",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS LAGOA DO MEIO"
  },
  {
    nome: "LUANDA SILVA SANTOS",
    email: "luanda.santos@email.com",
    ubs: "UBS PLANALTO",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS PLANALTO"
  },
  {
    nome: "LUCIANE SANTOS DE BRITO MENDES",
    email: "luciane.mendes@email.com",
    ubs: "Rio Quartel",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no Rio Quartel"
  },
  {
    nome: "MARCOS BUFFON FREITAS",
    email: "marcos.freitas@email.com",
    ubs: "TRES BARRAS",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende em TRES BARRAS"
  },
  {
    nome: "RAQUEL CAVALLINI SILVA",
    email: "raquel.silva@email.com",
    ubs: "UBS CENTRO",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS CENTRO"
  },
  {
    nome: "RONNIE EMERSON SIMONASSI",
    email: "ronnie.simonassi@email.com",
    ubs: "UBS Humaitá e Bagueira",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS Humaitá e Bagueira"
  },
  {
    nome: "SONIA APARECIDA AUTULLO RAMOS",
    email: "sonia.ramos@email.com",
    ubs: "INTERLAGOS 2",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no INTERLAGOS 2"
  },
  {
    nome: "SAMILY ARPINI GABURRO",
    email: "samily.gaburro@email.com",
    ubs: "Aviso 1 / araça",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no Aviso 1 / araça"
  },
  {
    nome: "VANDERSON DE JESUS",
    email: "vanderson.jesus@email.com",
    ubs: "intergalos II",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no intergalos II"
  },
  {
    nome: "WEVERTON KENPIN",
    email: "weverton.kenpin@email.com",
    ubs: "UBS BEBEDOURO",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende na UBS BEBEDOURO"
  },
  {
    nome: "EDI WAGNER SASAKI",
    email: "edi.sasaki@email.com",
    ubs: "ARAÇA",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no ARAÇA"
  },
  {
    nome: "RICARDO WANDDELREY OLIVEIRA",
    email: "ricardo.oliveira@email.com",
    ubs: "LINHARES 5",
    role: "dentista",
    ativo: true,
    especialidade: "Clínico Geral",
    observacoes: "Atende no LINHARES 5"
  }
];

// Função para gerar senha no formato: PrimeiroNome.ultimoSobrenome
function gerarSenha(nomeCompleto) {
  const partes = nomeCompleto.split(' ');
  const primeiroNome = partes[0];
  const ultimoSobrenome = partes[partes.length - 1];
  
  // Remover acentos
  const semAcentos = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };
  
  const primeiroNomeFormatado = semAcentos(primeiroNome).charAt(0).toUpperCase() + 
                                semAcentos(primeiroNome).slice(1).toLowerCase();
  
  const ultimoSobrenomeFormatado = semAcentos(ultimoSobrenome).charAt(0).toUpperCase() + 
                                   semAcentos(ultimoSobrenome).slice(1).toLowerCase();
  
  return `${primeiroNomeFormatado}.${ultimoSobrenomeFormatado}`;
}

// Função para autenticar admin
async function autenticarAdmin() {
  return new Promise((resolve, reject) => {
    rl.question('📧 Email do administrador: ', (email) => {
      rl.question('🔑 Senha do administrador: ', async (password) => {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log('✅ Admin autenticado com sucesso!\n');
          resolve(userCredential.user);
        } catch (error) {
          console.error('❌ Erro ao autenticar admin:', error.message);
          reject(error);
        }
      });
    });
  });
}

// Função principal para cadastrar dentistas
async function cadastrarDentistas() {
  try {
    console.log('🚀 Iniciando cadastro de dentistas...\n');
    console.log('='.repeat(60));
    console.log('🔐 PRIMEIRO: Faça login com uma conta de ADMINISTRADOR');
    console.log('='.repeat(60));
    
    // Autenticar admin primeiro
    const adminUser = await autenticarAdmin();
    rl.close();
    
    console.log(`👤 Admin: ${adminUser.email}\n`);
    
    let sucessos = 0;
    let falhas = 0;
    let existentes = 0;
    
    for (const dentista of dentistas) {
      try {
        const senha = gerarSenha(dentista.nome);
        
        console.log(`📧 Criando: ${dentista.nome}`);
        console.log(`📧 Email: ${dentista.email}`);
        console.log(`🔑 Senha: ${senha}`);
        console.log(`🏥 UBS: ${dentista.ubs}`);
        console.log('-'.repeat(40));
        
        // Criar usuário no Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          dentista.email, 
          senha
        );
        
        const user = userCredential.user;
        
        // Criar documento no Firestore
        await setDoc(doc(db, 'usuarios', user.uid), {
          uid: user.uid,
          nome: dentista.nome,
          email: dentista.email,
          role: dentista.role,
          ubs: dentista.ubs,
          ativo: dentista.ativo,
          especialidade: dentista.especialidade,
          observacoes: dentista.observacoes,
          dataCriacao: new Date(),
          criadoPor: adminUser.uid,
          ultimoAcesso: null
        });
        
        console.log(`✅ CADASTRADO COM SUCESSO!\n`);
        sucessos++;
        
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️  USUÁRIO JÁ EXISTE: ${dentista.email}\n`);
          existentes++;
        } else if (error.code === 'auth/too-many-requests') {
          console.log(`⏳ MUITAS REQUISIÇÕES. Aguarde alguns minutos...\n`);
          falhas++;
        } else {
          console.error(`❌ ERRO AO CADASTRAR ${dentista.email}:`, error.code, error.message, '\n');
          falhas++;
        }
      }
    }
    
    console.log('='.repeat(60));
    console.log('📊 RESUMO DO CADASTRO:');
    console.log(`✅ Cadastrados com sucesso: ${sucessos}`);
    console.log(`⚠️  Já existentes: ${existentes}`);
    console.log(`❌ Falhas: ${falhas}`);
    console.log(`📋 Total de profissionais: ${dentistas.length}`);
    console.log('='.repeat(60));
    console.log('🎉 Processo de cadastro finalizado!');
    
  } catch (error) {
    console.error('❌ Erro durante o processo:', error);
    rl.close();
  }
}

// Executar o script
cadastrarDentistas();