// Menu hambúrguer
const menuToggleBtn = document.getElementById("menuToggleBtn");
const mobileNavLinks = document.getElementById("mobileNavLinks");
const mobileNavBackdrop = document.getElementById("mobileNavBackdrop");

if (menuToggleBtn && mobileNavLinks) {
  const syncMobileMenuState = (isOpen) => {
    const shouldLockScroll = isOpen && window.innerWidth <= 640;
    document.documentElement.classList.toggle("menu-open", shouldLockScroll);
    document.body.classList.toggle("menu-open", shouldLockScroll);

    if (mobileNavBackdrop) {
      mobileNavBackdrop.classList.toggle("hidden", !shouldLockScroll);
    }
  };

  const closeMobileMenu = () => {
    mobileNavLinks.classList.remove("is-open");
    menuToggleBtn.setAttribute("aria-expanded", "false");
    menuToggleBtn.setAttribute("aria-label", "Abrir menu de navegação");
    syncMobileMenuState(false);
  };

  menuToggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = mobileNavLinks.classList.toggle("is-open");
    menuToggleBtn.setAttribute("aria-expanded", String(isOpen));
    menuToggleBtn.setAttribute(
      "aria-label",
      isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"
    );
    syncMobileMenuState(isOpen);
  });

  if (mobileNavBackdrop) {
    mobileNavBackdrop.addEventListener("click", () => {
      closeMobileMenu();
    });
  }

  mobileNavLinks.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  mobileNavLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("click", (event) => {
    if (
      mobileNavLinks.classList.contains("is-open") &&
      !mobileNavLinks.contains(event.target) &&
      !menuToggleBtn.contains(event.target)
    ) {
      closeMobileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileNavLinks.classList.contains("is-open")) {
      closeMobileMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640 && mobileNavLinks.classList.contains("is-open")) {
      closeMobileMenu();
    } else {
      syncMobileMenuState(mobileNavLinks.classList.contains("is-open"));
    }
  });
}

// Chat da alexIA
const chatFabBtn = document.getElementById("chatFabBtn");
const chatPopup = document.getElementById("chatPopup");
const closeChatBtn = document.getElementById("closeChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatMessages = document.getElementById("chatMessages");
const chatStatusText = document.getElementById("chatStatusText");
const quickChipButtons = document.querySelectorAll(".quick-chip");

const INITIAL_AI_GREETING =
  "Olá! Sou a **alexIA**. Toque em um balãozinho abaixo ou pergunte sobre experiências, aprendizados, formação, interesses ou competências de Alexia Camargo.";

let chatHistory = [
  { role: "model", text: INITIAL_AI_GREETING }
];

function setControlsDisabled(disabled) {
  sendChatBtn.disabled = disabled;
  quickChipButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

function syncMobileChatScrollLock(isOpen) {
  if (window.innerWidth <= 640) {
    document.documentElement.classList.toggle("lightbox-open", isOpen);
    document.body.classList.toggle("lightbox-open", isOpen);
  } else if (!isOpen) {
    document.documentElement.classList.remove("lightbox-open");
    document.body.classList.remove("lightbox-open");
  }
}

function toggleChat(forceOpen) {
  const willOpen = typeof forceOpen === "boolean" ? forceOpen : chatPopup.classList.contains("hidden");
  chatPopup.classList.toggle("hidden", !willOpen);
  chatFabBtn.setAttribute("aria-expanded", String(willOpen));
  syncMobileChatScrollLock(willOpen);
  if (willOpen) {
    const hasConversation = chatHistory.length > 1 || chatMessages.children.length > 1;
    requestAnimationFrame(() => {
      chatMessages.scrollTop = hasConversation ? chatMessages.scrollHeight : 0;
    });
    if (window.innerWidth > 640) {
      chatInput.focus();
    }
  }
}

function formatMessageHtml(text) {
  let normalized = String(text || "")
    .replaceAll("\\n", "\n")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[\*-]\s+/gm, "• ");

  // Em linhas com "• " e ":", deixa negrito apenas no que vem antes de ":"
  normalized = normalized.replace(/^(•\s+[^:\n]+:)(.*)$/gm, (_, prefix, rest) => {
    const cleanPrefix = prefix
      .replace(/^•\s+/, "")
      .replace(/\*\*/g, "")
      .trim();
    const cleanRest = rest.replace(/\*\*/g, "");
    return `• **${cleanPrefix}**${cleanRest}`;
  });

  // Garante linha em branco ("\n\n") separando cada tópico com "• "
  normalized = normalized.replace(/\n+(?=•\s)/g, "\n\n").trim();

  const escaped = normalized
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").trim();
}

function addMessage(role, text, isError = false) {
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "msg-user" : "msg-ai"} ${isError ? "msg-error" : ""}`;

  if (role === "user") {
    div.textContent = String(text || "").trim();
  } else {
    div.innerHTML = formatMessageHtml(text);
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

async function checkStatus() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (res.ok && (data.hasApiKey || data.fallbackEnabled)) {
      chatStatusText.textContent = "Online";
      chatStatusText.dataset.online = "true";
    } else {
      chatStatusText.textContent = "Configure GEMINI_API_KEY no .env";
      chatStatusText.dataset.online = "false";
    }
  } catch {
    chatStatusText.textContent = "Servidor Node offline";
    chatStatusText.dataset.online = "false";
  }
}

async function handleSend(userText) {
  const trimmed = String(userText || "").trim();
  if (!trimmed) return;

  addMessage("user", trimmed);
  chatInput.value = "";
  setControlsDisabled(true);

  const loadingMsg = addMessage("ai", "Digitando...");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        history: chatHistory
      })
    });

    const data = await res.json();

    if (!res.ok) {
      loadingMsg.classList.add("msg-error");
      loadingMsg.textContent = data.error || "Não foi possível obter resposta.";
      return;
    }

    loadingMsg.innerHTML = formatMessageHtml(data.reply);
    chatStatusText.textContent = "Online";
    chatStatusText.dataset.online = "true";
    chatHistory.push({ role: "user", text: trimmed });
    chatHistory.push({ role: "model", text: data.reply });
    chatHistory = chatHistory.slice(-12);
  } catch {
    loadingMsg.classList.add("msg-error");
    loadingMsg.textContent = "Erro de conexão com o servidor Node.js.";
  } finally {
    setControlsDisabled(false);
    if (window.innerWidth > 640) {
      chatInput.focus();
    }
  }
}

quickChipButtons.forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.getAttribute("data-prompt");
    if (prompt) {
      handleSend(prompt);
    }
  });
});

chatFabBtn.addEventListener("click", () => toggleChat());
closeChatBtn.addEventListener("click", () => toggleChat(false));

clearChatBtn.addEventListener("click", () => {
  chatHistory = [{ role: "model", text: INITIAL_AI_GREETING }];
  chatMessages.innerHTML = `<div class="msg msg-ai">Conversa limpa. Toque em um balãozinho abaixo ou pergunte sobre a trajetória de Alexia Camargo.</div>`;
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSend(chatInput.value);
});

// Projetos
const PORTIFOLIO_PROJECTS = [
  {
    name: "BUTIÁ",
    description:
      "Assistente virtual e guia digital especializado em Alegrete/RS e na cultura gaúcha, criado para unir identidade regional com IA.\n\n(v1.1.0 em desenvolvimento contínuo).",
    tags: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Gemini & Groq"
    ],
    imageUrl: "assets/butia.png",
    githubUrl: "",
    vercelUrl: "https://butia.vercel.app"
  }
];

const projectsGrid = document.getElementById("projectsGrid");

function escapeAttr(url) {
  return String(url || "").replaceAll('"', "&quot;");
}

function escapeText(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Visualização em tela cheia
const imageLightbox = document.createElement("div");
imageLightbox.id = "imageLightbox";
imageLightbox.className = "image-lightbox hidden";
imageLightbox.setAttribute("role", "dialog");
imageLightbox.setAttribute("aria-modal", "true");
imageLightbox.setAttribute("aria-label", "Imagem do projeto em tela cheia");
imageLightbox.innerHTML = `
  <button
    id="closeLightboxBtn"
    class="image-lightbox-close"
    type="button"
    title="Fechar"
    aria-label="Fechar imagem"
  >
    ✕
  </button>
  <div id="lightboxStage" class="image-lightbox-stage">
    <img id="lightboxImg" src="" alt="" class="image-lightbox-img" draggable="false" />
  </div>
  <p id="lightboxCaption" class="image-lightbox-caption"></p>
`;
document.body.appendChild(imageLightbox);

const lightboxStage = document.getElementById("lightboxStage");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCaption = document.getElementById("lightboxCaption");
const closeLightboxBtn = document.getElementById("closeLightboxBtn");

const MIN_SCALE = 1;
const MAX_SCALE = 3.5;
const DOUBLE_TAP_SCALE = 1.85;

let scale = 1;
let panX = 0;
let panY = 0;

let isDragging = false;
let dragMoved = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX = 0;
let panStartY = 0;

let isPinching = false;
let pinchStartDistance = 0;
let pinchStartScale = 1;

let lastTapTime = 0;

function isPointInsideImage(clientX, clientY) {
  if (!lightboxImg.getAttribute("src")) return false;
  const rect = lightboxImg.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function getMaxPan() {
  const rect = lightboxImg.getBoundingClientRect();
  const baseWidth = rect.width / (scale || 1);
  const baseHeight = rect.height / (scale || 1);
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  const maxPanX = Math.max(0, (scaledWidth - window.innerWidth * 0.9) / 2);
  const maxPanY = Math.max(0, (scaledHeight - window.innerHeight * 0.72) / 2);

  return { maxPanX, maxPanY };
}

function clampPan() {
  if (scale <= 1.01) {
    panX = 0;
    panY = 0;
    return;
  }
  const { maxPanX, maxPanY } = getMaxPan();
  panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
}

function renderTransform(animate = true) {
  lightboxImg.style.transition = animate
    ? "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)"
    : "none";
  lightboxImg.style.transform = `translate(-50%, -50%) translate3d(${panX.toFixed(1)}px, ${panY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
  lightboxImg.classList.toggle("is-zoomed", scale > 1.02);
}

function resetLightboxTransform(animate = false) {
  scale = 1;
  panX = 0;
  panY = 0;
  isDragging = false;
  dragMoved = false;
  isPinching = false;
  pinchStartDistance = 0;
  renderTransform(animate);
}

function setZoomAtPoint(targetScale, clientX, clientY, animate = true) {
  const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));

  if (nextScale <= 1.01) {
    scale = 1;
    panX = 0;
    panY = 0;
    renderTransform(animate);
    return;
  }

  if (typeof clientX === "number" && typeof clientY === "number") {
    const rect = lightboxImg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const scaleFactor = nextScale / scale;

    panX = panX * scaleFactor - dx * (scaleFactor - 1);
    panY = panY * scaleFactor - dy * (scaleFactor - 1);
  }

  scale = nextScale;
  clampPan();
  renderTransform(animate);
}

function getTouchDistance(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function getTouchMidpoint(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  };
}

function openImageLightbox(src, altText) {
  if (!src) return;
  resetLightboxTransform(false);
  lightboxImg.src = src;
  lightboxImg.alt = altText || "Imagem do projeto";
  lightboxCaption.textContent = altText || "";
  imageLightbox.classList.remove("hidden");
  document.documentElement.classList.add("lightbox-open");
  document.body.classList.add("lightbox-open");
  closeLightboxBtn.focus();
}

function closeImageLightbox() {
  resetLightboxTransform(false);
  imageLightbox.classList.add("hidden");
  document.documentElement.classList.remove("lightbox-open");
  document.body.classList.remove("lightbox-open");
  lightboxImg.removeAttribute("src");
  lightboxImg.alt = "";
  lightboxCaption.textContent = "";
}

closeLightboxBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  closeImageLightbox();
});

// Fecha ao clicar na área fora da imagem
imageLightbox.addEventListener("click", (e) => {
  if (imageLightbox.classList.contains("hidden")) return;
  if (e.target.closest("#closeLightboxBtn")) return;
  if (dragMoved) {
    dragMoved = false;
    return;
  }

  if (!isPointInsideImage(e.clientX, e.clientY)) {
    closeImageLightbox();
  }
});

// Duplo clique no desktop alterna entre tamanho original (1x) e ampliado (1.85x)
lightboxImg.addEventListener("dblclick", (e) => {
  e.preventDefault();
  e.stopPropagation();
  const nextScale = scale > 1.02 ? 1 : DOUBLE_TAP_SCALE;
  setZoomAtPoint(nextScale, e.clientX, e.clientY, true);
});

// Arrastar com mouse quando ampliado
lightboxImg.addEventListener("mousedown", (e) => {
  if (e.button !== 0 || scale <= 1.02) return;
  e.preventDefault();
  e.stopPropagation();
  isDragging = true;
  dragMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  panStartX = panX;
  panStartY = panY;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
    dragMoved = true;
  }
  panX = panStartX + dx;
  panY = panStartY + dy;
  clampPan();
  renderTransform(false);
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  renderTransform(true);
});

// Touch
imageLightbox.addEventListener(
  "touchstart",
  (e) => {
    if (!e.touches) return;

    if (e.touches.length === 2) {
      isDragging = false;
      isPinching = true;
      pinchStartDistance = getTouchDistance(e.touches[0], e.touches[1]);
      pinchStartScale = scale;
      return;
    }

    if (e.touches.length === 1 && scale > 1.02) {
      const t = e.touches[0];
      isDragging = true;
      dragMoved = false;
      dragStartX = t.clientX;
      dragStartY = t.clientY;
      panStartX = panX;
      panStartY = panY;
    }
  },
  { passive: true }
);

imageLightbox.addEventListener(
  "touchmove",
  (e) => {
    if (!e.touches) return;

    if (e.touches.length === 2 && pinchStartDistance > 0) {
      e.preventDefault();
      e.stopPropagation();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const mid = getTouchMidpoint(e.touches[0], e.touches[1]);
      const ratio = dist / pinchStartDistance;
      setZoomAtPoint(pinchStartScale * ratio, mid.x, mid.y, false);
      return;
    }

    if (e.touches.length === 1 && isDragging && scale > 1.02) {
      e.preventDefault();
      e.stopPropagation();
      const t = e.touches[0];
      const dx = t.clientX - dragStartX;
      const dy = t.clientY - dragStartY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dragMoved = true;
      }
      panX = panStartX + dx;
      panY = panStartY + dy;
      clampPan();
      renderTransform(false);
    }
  },
  { passive: false }
);

imageLightbox.addEventListener("touchend", (e) => {
  if (e.touches && e.touches.length < 2) {
    isPinching = false;
    pinchStartDistance = 0;
  }

  if (isDragging) {
    isDragging = false;
    renderTransform(true);
  }

  const targetIsImage = e.target === lightboxImg || lightboxImg.contains(e.target);
  if (
    targetIsImage &&
    !isPinching &&
    !dragMoved &&
    (!e.touches || e.touches.length === 0) &&
    e.changedTouches &&
    e.changedTouches.length === 1
  ) {
    const touch = e.changedTouches[0];
    const now = Date.now();
    if (now - lastTapTime < 300) {
      e.preventDefault();
      e.stopPropagation();
      const nextScale = scale > 1.02 ? 1 : DOUBLE_TAP_SCALE;
      setZoomAtPoint(nextScale, touch.clientX, touch.clientY, true);
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  }

  if (!e.touches || e.touches.length === 0) {
    dragMoved = false;
  }
});

document.addEventListener("gesturestart", (e) => {
  if (!imageLightbox.classList.contains("hidden")) {
    e.preventDefault();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !imageLightbox.classList.contains("hidden")) {
    closeImageLightbox();
  }
});

function renderProjects() {
  if (!PORTIFOLIO_PROJECTS.length) {
    projectsGrid.innerHTML = `
      <div class="project-card">
        <div class="project-body">
          <h3>Projetos em breve</h3>
        </div>
      </div>
    `;
    return;
  }

  projectsGrid.innerHTML = PORTIFOLIO_PROJECTS
    .map((proj) => {
      const altText = `Imagem do projeto ${proj.name}`;
      const thumbHtml = proj.imageUrl
        ? `<button
             type="button"
             class="project-thumb-btn"
             data-lightbox-src="${escapeAttr(proj.imageUrl)}"
             data-lightbox-alt="${escapeAttr(altText)}"
             title="Clique para abrir em tela cheia"
             aria-label="Abrir em tela cheia: ${escapeAttr(altText)}"
           >
             <img src="${escapeAttr(proj.imageUrl)}" alt="${escapeText(altText)}" class="project-thumb" />
           </button>`
        : "";

      const tagsHtml = Array.isArray(proj.tags) && proj.tags.length
        ? `<ul class="project-tags" aria-label="Tecnologias utilizadas">
             ${proj.tags.map((tag) => `<li class="project-tag">${escapeText(tag)}</li>`).join("")}
           </ul>`
        : "";

      const githubBtn = proj.githubUrl
        ? `<a class="proj-link-btn" href="${escapeAttr(proj.githubUrl)}" target="_blank" rel="noopener noreferrer" title="Abrir no GitHub">
             <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
               <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
             </svg>
             <span>GitHub</span>
           </a>`
        : "";

      const vercelBtn = proj.vercelUrl
        ? `<a class="proj-link-btn" href="${escapeAttr(proj.vercelUrl)}" target="_blank" rel="noopener noreferrer" title="Abrir no Vercel">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
               <path d="M12 2L24 22H0L12 2z"/>
             </svg>
             <span>Vercel</span>
           </a>`
        : "";

      return `
        <article class="project-card">
          <div class="project-thumb-wrap">
            ${thumbHtml}
          </div>
          <div class="project-body">
            <h3>${escapeText(proj.name)}</h3>
            <p style="white-space: pre-line;">${escapeText(proj.description)}</p>
            ${tagsHtml}
          </div>
          <div class="project-links">
            ${githubBtn}
            ${vercelBtn}
          </div>
        </article>
      `;
    })
    .join("");

  projectsGrid.querySelectorAll(".project-thumb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-lightbox-src");
      const alt = btn.getAttribute("data-lightbox-alt");
      openImageLightbox(src, alt);
    });
  });
}

renderProjects();
checkStatus();