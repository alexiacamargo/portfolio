# Portfólio — Alexia Camargo

Portfólio profissional desenvolvido para apresentar trajetória acadêmica, experiências, projetos e competências em tecnologia e gestão, contando com a assistente virtual **alexIA** integrada à API do Google Gemini.

> 🌐 **Online em:** [portfolio-alexiacamargo.vercel.app](https://portfolio-alexiacamargo.vercel.app)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

---

## ✨ Destaques

* 📋 **Trajetória em Kanban:** Quadros organizados para experiências profissionais, formação acadêmica e próximos objetivos em **Dados, IA, Python e Desenvolvimento Web**.
* 🤖 **Assistente Virtual (alexIA):** Chat integrado à API do Google Gemini — com fallback automático em base local para garantir disponibilidade contínua — para tirar dúvidas sobre formação, experiências, competências e projetos.
* 🖼️ **Vitrine de Projetos:** Apresentação dos projetos desenvolvidos, com visualização em tela cheia e acesso direto aos links publicados.
* 📱 **Design Responsivo:** Interface limpa e adaptável para desktop e dispositivos móveis.

---

## 🏗️ Tecnologias e Arquitetura

* **Front-end:** HTML5, CSS3 e JavaScript
* **Back-end & API:** Node.js, Express e Google Gemini API
* **Infraestrutura & Deploy:** Vercel (Serverless Functions)

```text
portfolio/
├── api/
│   └── index.js          # Endpoint serverless na Vercel
├── public/
│   ├── assets/           # Identidade visual e imagens dos projetos
│   ├── app.js            # Interatividade, vitrine de projetos e chat da alexIA
│   ├── index.html        # Estrutura semântica da aplicação
│   └── styles.css        # Estilização e layout responsivo
├── server.js             # Servidor Express, rotas da API e contexto da alexIA
├── vercel.json           # Regras de roteamento em produção
└── package.json          # Metadados e dependências do projeto
```