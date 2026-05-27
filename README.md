# 📦 EventHUB

O **EventHUB** é um sistema web moderno de gestão de estoque e locações desenvolvido para empresas de eventos.  
A aplicação permite controlar equipamentos como mesas, cadeiras, iluminação, caixas de som e estruturas metálicas de forma organizada, automatizada e segura.

---

# 🚀 Funcionalidades

- 🔐 Login e cadastro de usuários com Supabase Auth  
- 📦 Cadastro de itens e equipamentos  
- 📊 Controle de estoque em tempo real  
- ⚠️ Alerta automático de estoque mínimo  
- 🔄 Registro de entradas e saídas  
- 📅 Sistema de locações  
- 🔁 Devolução automática de estoque  
- 📈 Histórico de movimentações  
- 👤 Separação de dados por usuário (RLS)  
- 📱 Layout responsivo e moderno  

---

# 🎯 Objetivo

O EventHUB foi desenvolvido para melhorar a organização e o controle de empresas de eventos, automatizando o gerenciamento de estoque e locações, reduzindo falhas operacionais e aumentando a eficiência da empresa.

---

# 🛠️ Tecnologias Utilizadas

## Frontend
- HTML5  
- CSS3  
- JavaScript  

## Backend / Banco de Dados
- Supabase  
- PostgreSQL  
- Supabase Auth  

## Ferramentas
- GitHub  
- Visual Studio Code  

---

# ✨ Melhorias da Nova Versão

A nova versão do EventHUB recebeu diversas melhorias em relação ao projeto original:

- ✅ Layout totalmente modernizado  
- ✅ Melhor responsividade para celular e notebook  
- ✅ Tela de login reformulada  
- ✅ Controle automático de estoque  
- ✅ Locações integradas ao estoque  
- ✅ Movimentações automáticas  
- ✅ Correção de bugs no Supabase  
- ✅ Implementação de RLS (segurança por usuário)  
- ✅ Melhor experiência visual e organização  

---

# 📁 Estrutura do Projeto

```plaintext
EventHUB/
│
├── css/
│   └── style.css
│
├── js/
│   ├── auth.js
│   ├── estoque.js
│   ├── home.js
│   ├── itens.js
│   ├── locacoes.js
│   ├── login.js
│   └── supabaseClient.js
│
├── ── EventHUB.sql
│
├── assets/
│   └── imagens e logo do sistema
│
├── estoque.html
├── home.html
├── itens.html
├── locacoes.html
├── login.html
├── README.md
└── LICENSE
```

---

# 🗄️ Banco de Dados

O banco de dados foi desenvolvido utilizando o **Supabase**.

O projeto utiliza:

- Supabase Database  
- Supabase Auth  
- PostgreSQL  
- Row Level Security (RLS)  

---

# ⚙️ Como Configurar o Banco

## 1. Criar um projeto no Supabase

Acesse:

```plaintext
https://supabase.com
```

Crie um novo projeto.

---

## 2. Executar o SQL

Acesse:

```plaintext
SQL Editor
```

Execute o arquivo:

```plaintext
EventHUB.sql
```

---

## 3. Configurar as Chaves do Supabase

Abra o arquivo:

```plaintext
js/supabaseClient.js
```

Adicione:

```javascript
const SUPABASE_URL = 'SUA_URL';
const SUPABASE_KEY = 'SUA_ANON_KEY';
```

---

# ▶️ Como Executar o Projeto

## 1. Clone o repositório

```bash
git clone https://github.com/dannx06/EventHUB-Project.git
```

---

## 2. Acesse a pasta

```bash
cd EventHUB
```

---

## 3. Abra o projeto

Abra o arquivo:

```plaintext
login.html
```

Ou utilize a extensão **Live Server** no VS Code.

---

# 🔒 Segurança

O sistema utiliza **Row Level Security (RLS)**.

Isso garante que cada usuário visualize apenas:

- seus itens;
- suas movimentações;
- suas locações;
- seus dados.

---

# 💡 Sobre o Projeto

Este projeto foi desenvolvido com fins acadêmicos para praticar:

- desenvolvimento web;
- integração com banco de dados;
- autenticação de usuários;
- controle de estoque;
- organização de sistemas empresariais.

---

# 👨‍💻 Autor

Desenvolvido por **Daniel Luna**

GitHub:

```plaintext
https://github.com/dannx06
```

---

# 📄 Licença

Este projeto está sob a licença MIT.
