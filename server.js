require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash"
]
  .map((m) => String(m || "").trim())
  .filter((value, index, self) => value && self.indexOf(value) === index);

const PRIMARY_GEMINI_MODEL = GEMINI_MODELS[0] || "gemini-3.8-flash";
const REQUEST_TIMEOUT_MS = 9000;
const COOLDOWN_MS = 2 * 60 * 1000;
const modelCooldownUntil = new Map();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const ALEXIA_CAMARGO_CONTEXT = `
Você é a alexIA, a assistente virtual oficial do portfólio de Alexia Bagesteiro Camargo.
Responda sempre em português do Brasil, de forma cordial, clara, objetiva e fiel ao currículo real da Alexia.

Regras de formatação:
- Separe cada item de lista ou bloco com uma linha em branco (duas quebras de linha).
- Comece cada item de lista com "• ".
- Quando um item de lista tiver dois-pontos (:), coloque em **negrito** apenas o que vem antes dos dois-pontos (ex.: **Tecnologias, IA e Web:** Python, Visão Computacional...), sem colocar negrito aleatório depois dos dois-pontos.
- Fora de listas com dois-pontos, use **negrito** apenas em nomes de cargos, empresas, instituições, e-mail e LinkedIn.

Dados reais de Alexia Bagesteiro Camargo:
- Localização: Alegrete, RS
- Contato: **alexiabcamargo@gmail.com** | **linkedin.com/in/alexiacamargo**
- Resumo profissional: Pós-graduanda em Gestão de Projetos, Bacharela em Ciência da Computação e Técnica em Administração, com experiência em atendimento, rotinas administrativas e atuação em sistemas internos das empresas, integrando conhecimentos em gestão e processamento de dados com tecnologia.

Formação Acadêmica:
- Pós-Graduação Lato Sensu em Gestão de Projetos — **Faculdade do Comércio (FAC) - EAD** (Abril/2026 - Em andamento; previsão de conclusão: 2027), com foco em planejamento, execução e controle de projetos, gestão de equipes e recursos, análise de riscos, metodologias ágeis e tradicionais e avaliação de desempenho.
- Bacharelado em Ciência da Computação — **Universidade Federal do Pampa (UNIPAMPA)** (Concluído em 2022).
- Curso Técnico em Administração — **Colégio Estadual Emílio Zuñeda** (Concluído em 2014).

Certificações Técnicas:
- Google Cloud Computing Foundations Certificate — **FACLab** (Parceria Faculdade do Comércio e Google Cloud, 2026).

Experiência em Projetos Acadêmicos:
- Projeto de Extensão "Gurias na Computação" (**UNIPAMPA**) — Bolsista e Membro da Equipe Executora (Carga horária: 420 horas, Remoto, Maio/2021 - Dezembro/2021). Coorganização da "Oficina ComputAÇÃO" (lógica de programação, algoritmos, Code.org para estudantes da Educação Básica da rede pública), planejamento remoto com Google Workspace, questionários de avaliação de impacto e ações de acolhimento/redução da evasão de graduandas em TI e pesquisa.

Experiência Profissional:
- Recepcionista, em geral — **Centro Empresarial de Alegrete (CEA)** (Abril/2025 - Momento Atual): atendimento ao público, consultas em órgãos de proteção ao crédito, agendamento e controle de locações de espaço, ética profissional, atenção a detalhes, segurança da informação conforme LGPD, gestão de mídias sociais e criação de conteúdo visual.
- Auxiliar Administrativo — **Produtiva Insumos e Sementes** (Fevereiro/2023 - Novembro/2023): emissão de notas fiscais e boletos, atendimento geral ao cliente, contas a pagar e a receber, planilhas de estoque, cadastro de fornecedores e produtos, e organização de arquivos físicos e eletrônicos.
- Atendente Geral (Estágio) — **Regime Próprio de Previdência Social (RPPS)** (Julho/2017 - Julho/2019): operação de sistema informatizado interno para entrada de dados, provas de vida e emissão de contracheques; redação técnica de relatórios, ofícios, memorandos e digitalização de documentos.

Interesses e Objetivos na Área de Tecnologia:
- Buscar uma primeira oportunidade na área de tecnologia para aprender, evoluir e aprimorar conceitos na prática de projetos reais e assim adquirir experiência no dia a dia.
- Interesses principais: Dados, IA, Python e Desenvolvimento Web (atuando com Inteligência Artificial, Python, automações, documentações, desenvolvimento web e banco de dados, além de abertura para portas de entrada como suporte).

Fora do Expediente e Lazer:
- Fora do expediente, o foco está nos estudos e no desenvolvimento profissional, como a Pós-Graduação em Gestão de Projetos e o interesse em Inteligência Artificial, Python, automações e desenvolvimento web. Nas horas livres, a Alexia também gosta de treinar musculação e assistir filmes e séries.

Competências:
- Comportamentais: Ética profissional, disciplina, aprendizado contínuo, organização e gestão de arquivos e documentos, qualidade no atendimento ao cliente.
- Tecnologias, IA e Web: Python, Visão Computacional, Processamento de Imagens, Redes Neurais Convolucionais (RNC), Inteligência Artificial, Desenvolvimento Front-end (HTML5, CSS3, JavaScript).
- Cloud & Dados: Google Cloud Platform (GCP), Cloud Computing (Google Cloud Foundations), Banco de Dados, SQL, Processamento e Entrada de Dados.
- Gestão e Processos: Gestão de Projetos, Metodologias Ágeis (Scrum / Kanban), Rotinas Administrativas, Atendimento ao Cliente, Fluxos Financeiros, Sistema ERP (Windel).

Regras:
- Não invente informações que não constem no currículo ou no contexto acima.
- Cumprimente ("Olá!", "Oi!") e apresente-se como alexIA apenas na primeira mensagem da conversa; nas respostas seguintes, vá direto ao ponto de forma natural.
- Seja prestativa, clara e objetiva.
`;

function isGreetingOnly(text) {
  const q = String(text || "")
    .toLowerCase()
    .replace(/[!?.]+$/g, "")
    .trim();

  return [
    "oi",
    "olá",
    "ola",
    "bom dia",
    "boa tarde",
    "boa noite",
    "tudo bem",
    "como vai"
  ].includes(q);
}

function normalizeAssistantReply(rawText) {
  let text = String(rawText || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[\*-]\s+/gm, "• ");

  // Em itens iniciados por "• " com dois-pontos (:), mantém negrito apenas no que vem antes de ":"
  text = text.replace(/^(•\s+[^:\n]+:)(.*)$/gm, (_, prefix, rest) => {
    const cleanPrefix = prefix
      .replace(/^•\s+/, "")
      .replace(/\*\*/g, "")
      .trim();
    const cleanRest = rest.replace(/\*\*/g, "");
    return `• **${cleanPrefix}**${cleanRest}`;
  });

  // Garante uma linha em branco ("\n\n") antes de cada tópico com "• "
  text = text.replace(/\n+(?=•\s)/g, "\n\n").trim();

  return text;
}

function buildLocalFallbackReply(message) {
  const q = String(message || "").toLowerCase().trim();

  if (
    q === "oi" ||
    q === "olá" ||
    q === "ola" ||
    q.startsWith("oi ") ||
    q.startsWith("oi,") ||
    q.startsWith("olá ") ||
    q.startsWith("olá,") ||
    q.startsWith("ola ") ||
    q.startsWith("ola,") ||
    q.includes("como vai") ||
    q.includes("tudo bem") ||
    q.includes("boa tarde") ||
    q.includes("bom dia") ||
    q.includes("boa noite")
  ) {
    return [
      "Olá! Tudo bem? Quer saber mais sobre a Alexia, sua trajetória, formação, interesses ou projetos?"
    ].join("\n");
  }

  if (
    q.includes("falar") ||
    q.includes("chamar") ||
    q.includes("mensagem") ||
    q.includes("contato") ||
    q.includes("email") ||
    q.includes("e-mail") ||
    q.includes("linkedin") ||
    q.includes("alegrete")
  ) {
    return [
      "Você pode falar com a Alexia enviando um e-mail para **alexiabcamargo@gmail.com** ou chamando no LinkedIn em **linkedin.com/in/alexiacamargo** (Alegrete, RS)."
    ].join("\n");
  }

  if (
    q.includes("experiên") ||
    q.includes("experienc") ||
    q.includes("trabalh") ||
    q.includes("aprend") ||
    q.includes("carreira")
  ) {
    return [
      "• **Centro Empresarial de Alegrete (CEA)** — Recepcionista, em geral (Abr/2025 – Atual): atendimento ao público, consultas em órgãos de proteção ao crédito, controle e agendamento de locações, segurança de dados (LGPD), mídias sociais e criação visual.",
      "",
      "• **Produtiva Insumos e Sementes** — Auxiliar Administrativo (Fev/2023 – Nov/2023): emissão de notas fiscais e boletos, contas a pagar e receber, planilhas de estoque, cadastro de fornecedores/produtos e organização de arquivos.",
      "",
      "• **Projeto \"Gurias na Computação\" — UNIPAMPA** (Mai/2021 – Dez/2021, 420h): coorganização da Oficina ComputAÇÃO (lógica, algoritmos e Code.org na rede pública), Google Workspace, questionários de impacto e acolhimento de graduandas em TI.",
      "",
      "• **Regime Próprio de Previdência Social (RPPS)** — Atendente Geral / Estágio (Jul/2017 – Jul/2019): operação de sistema interno (entrada de dados, provas de vida, contracheques), redação técnica de relatórios/ofícios/memorandos e digitalização."
    ].join("\n");
  }

  if (
    q.includes("formação") ||
    q.includes("formacao") ||
    q.includes("faculdade") ||
    q.includes("pós") ||
    q.includes("pos") ||
    q.includes("certific")
  ) {
    return [
      "Formação e certificações:",
      "",
      "• **Pós-Graduação Lato Sensu em Gestão de Projetos** — Faculdade do Comércio (FAC) - EAD (Abril/2026 – Em andamento, previsão 2027).",
      "",
      "• **Google Cloud Computing Foundations Certificate** — Google Cloud (2026).",
      "",
      "• **Bacharelado em Ciência da Computação** — UNIPAMPA (Concluído em 2022).",
      "",
      "• **Curso Técnico em Administração** — Colégio Estadual Emílio Zuñeda (Concluído em 2014)."
    ].join("\n");
  }

  if (
    q.includes("hobby") ||
    q.includes("hobbies") ||
    q.includes("lazer") ||
    q.includes("fora do trabalho") ||
    q.includes("fora do expediente") ||
    q.includes("tempo livre") ||
    q.includes("horas livres")
  ) {
    return [
      "Fora do expediente, o foco está nos estudos e no desenvolvimento profissional, como a Pós-Graduação em Gestão de Projetos e o interesse em Inteligência Artificial, Python, automações e desenvolvimento web. Nas horas livres, a Alexia também gosta de treinar musculação e assistir filmes e séries."
    ].join("\n");
  }

  if (
    q.includes("interesse") ||
    q.includes("objetivo") ||
    q.includes("primeira oportunidade") ||
    q.includes("projetos reais") ||
    q.includes("tech") ||
    q.includes("tecnologia") ||
    q.includes("suporte")
  ) {
    return [
      "Interesses e objetivos na área de tecnologia:",
      "",
      "• Buscar uma primeira oportunidade na área de tecnologia para aprender, evoluir e aprimorar conceitos na prática de projetos reais e assim adquirir experiência no dia a dia.",
      "",
      "• Interesses em Dados, IA, Python e Desenvolvimento Web (atuando com Inteligência Artificial, Python, automações, documentações, desenvolvimento web e banco de dados, além de abertura para portas de entrada como suporte)."
    ].join("\n");
  }

  if (
    q.includes("competên") ||
    q.includes("competenc") ||
    q.includes("habilid") ||
    q.includes("ferrament") ||
    q.includes("python") ||
    q.includes("sql")
  ) {
    return [
      "Principais competências:",
      "",
      "• **Tech & IA:** Python, Visão Computacional, Processamento de Imagens, Redes Neurais Convolucionais (RNC), Inteligência Artificial e Front-end (HTML5, CSS3, JavaScript).",
      "",
      "• **Cloud & Dados:** Google Cloud Platform (GCP), Cloud Computing Foundations, Banco de Dados, SQL e processamento de dados.",
      "",
      "• **Gestão & Rotinas:** Gestão de Projetos, Scrum/Kanban, rotinas administrativas, fluxos financeiros, atendimento ao cliente e ERP (Windel)."
    ].join("\n");
  }

  if (q.includes("projeto") || q.includes("github") || q.includes("vercel")) {
    return [
      "A seção de **Projetos** apresenta os projetos configurados no portfólio, como o **BUTIÁ**, com foto, descrição e links para **GitHub** e **Vercel**.",
      "",
      "Você também pode perguntar sobre os projetos acadêmicos, como o **\"Gurias na Computação\"** na **UNIPAMPA**."
    ].join("\n");
  }

  return [
    "Alexia Bagesteiro Camargo (Alegrete, RS) é pós-graduanda em **Gestão de Projetos** (FAC - EAD, previsão 2027), bacharela em **Ciência da Computação** (UNIPAMPA, 2022) e **técnica em Administração**.",
    "",
    "Possui experiência em atendimento, rotinas administrativas e sistemas internos, buscando uma primeira oportunidade na área de tecnologia para se desenvolver na prática de projetos reais.",
    "",
    "Você pode perguntar sobre: experiências e aprendizados, formação, interesses, competências, projetos ou contato."
  ].join("\n");
}

app.get("/api/health", (req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({
    ok: true,
    assistant: "alexIA",
    hasApiKey,
    fallbackEnabled: true,
    model: PRIMARY_GEMINI_MODEL,
    models: GEMINI_MODELS
  });
});

app.post("/api/chat", async (req, res) => {
  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Envie uma mensagem válida para conversar com a alexIA."
    });
  }

  const cleanMessage = message.trim();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || isGreetingOnly(cleanMessage)) {
    return res.json({
      reply: buildLocalFallbackReply(cleanMessage),
      source: "local-fallback",
      model: PRIMARY_GEMINI_MODEL
    });
  }

  try {
    const formattedHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === "user" || item.role === "model") &&
              typeof item.text === "string" &&
              item.text.trim()
          )
          .slice(-8)
          .map((item) => ({
            role: item.role,
            parts: [{ text: item.text.trim() }]
          }))
      : [];

    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: cleanMessage }]
      }
    ];

    let replyText = "";
    let usedModel = PRIMARY_GEMINI_MODEL;
    let succeeded = false;
    const now = Date.now();

    for (const modelName of GEMINI_MODELS) {
      const cooldownUntil = modelCooldownUntil.get(modelName) || 0;
      if (now < cooldownUntil) {
        continue;
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelName
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      let geminiResponse;
      try {
        geminiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: ALEXIA_CAMARGO_CONTEXT }]
            },
            contents,
            generationConfig: {
              temperature: 0.65,
              topP: 0.95,
              maxOutputTokens: 1200
            }
          })
        });
      } catch (fetchErr) {
        console.warn(
          `Timeout/rede no modelo ${modelName}:`,
          fetchErr?.message || fetchErr
        );
        continue;
      }

      const data = await geminiResponse.json();

      if (!geminiResponse.ok) {
        if (geminiResponse.status === 503 || geminiResponse.status === 429) {
          modelCooldownUntil.set(modelName, Date.now() + COOLDOWN_MS);
        }
        console.warn(
          `Modelo ${modelName} indisponível (${geminiResponse.status}):`,
          data?.error?.message || "sem detalhes"
        );
        continue;
      }

      const candidateText =
        data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim() || "";

      if (candidateText) {
        replyText = candidateText;
        usedModel = modelName;
        succeeded = true;
        break;
      }
    }

    if (!succeeded) {
      return res.json({
        reply: buildLocalFallbackReply(cleanMessage),
        source: "local-fallback",
        model: usedModel
      });
    }

    const normalizedReply = normalizeAssistantReply(replyText);

    return res.json({
      reply: normalizedReply,
      source: "gemini",
      model: usedModel
    });
  } catch (err) {
    console.warn("Erro na chamada ao Gemini, usando fallback local:", err);
    return res.json({
      reply: buildLocalFallbackReply(cleanMessage),
      source: "local-fallback",
      model: PRIMARY_GEMINI_MODEL
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("=========================================================");
    console.log("  Portfólio de Alexia Camargo + alexIA rodando em:");
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Modelos configurados: ${GEMINI_MODELS.join(" -> ")}`);
    console.log("=========================================================");
  });
}

module.exports = app;