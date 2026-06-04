(() => {
  const isLocalStaticPreview =
    ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    window.location.port &&
    window.location.port !== '3000';
  const API_BASE =
    window.__API_BASE__ ||
    (isLocalStaticPreview ? 'http://localhost:3000/api' : '/api');
  const TOKEN_KEY = 'ws_token';
  const USER_KEY = 'ws_user';
  const STATUS_META = {
    new: { label: 'Новая', badgeClass: 'badge-new' },
    work: { label: 'В работе', badgeClass: 'badge-progress' },
    done: { label: 'Выполнено', badgeClass: 'badge-done' },
  };

  const byId = (id) => document.getElementById(id);
  const HTML_ESCAPE = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE[char]);
  }

  function safeImageUrl(value) {
    const fallback = 'assets/img/opitclab.webp';
    const raw = String(value || '').trim();
    if (!raw) return fallback;

    if (/^\/?assets\/img\/[a-z0-9 _./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(raw)) {
      return encodeURI(raw);
    }

    try {
      const parsed = new URL(raw);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  const featuredPortfolioData = [
    {
      title: 'OPTIC LAB',
      image_url: 'assets/img/opitclab.webp',
      service_name: 'Сайт-каталог',
      description: 'Сайт сети салонов оптики с услугами, диагностикой и онлайн-записью.',
      stack: ['Vue 3', 'Laravel', 'MySQL'],
    },
    {
      title: 'Ragaza',
      image_url: 'assets/img/ragaza.webp',
      service_name: 'Промо-платформа',
      description: 'Промо-сайт студии с акцентом на кейсы, подход и сбор входящих заявок.',
      stack: ['Next.js', 'Framer Motion', 'Strapi'],
    },
    {
      title: 'ST Logistic',
      image_url: 'assets/img/Stllogistik.webp',
      service_name: 'Корпоративный сайт',
      description: 'Сайт транспортной компании с направлениями перевозок и формой расчета заявки.',
      stack: ['Nuxt', 'Directus', 'MySQL'],
    },
    {
      title: 'Dealer Cars',
      image_url: 'assets/img/image 6.webp',
      service_name: 'Мультистраничный проект',
      description: 'Сайт автодилера с презентацией моделей, характеристиками и формой консультации.',
      stack: ['React', 'NestJS', 'Redis'],
    },
  ];

  function applyMotionToChildren(container, step = 85) {
    if (!container) return;
    const items = Array.from(container.children).filter((node) => node.nodeType === 1);
    items.forEach((item, index) => {
      item.classList.add('wh-motion');
      item.style.setProperty('--motion-delay', `${Math.min(index, 10) * step}ms`);
    });
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (_err) {
      clearSession();
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthError(message) {
    const normalized = String(message || '').toLowerCase();
    return normalized.includes('unauthorized') || normalized.includes('invalid token');
  }

  function redirectToLogin() {
    clearSession();
    if (window.location.pathname.endsWith('/login.html')) return;
    window.location.href = 'login.html';
  }

  function showMessage(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text;
    el.className = `notice notice-${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  }

  function clearMessage(el) {
    if (!el) return;
    el.textContent = '';
    el.className = 'notice';
  }

  function setButtonPending(button, isPending, pendingText = 'Отправка...') {
    if (!button) return;
    if (isPending) {
      if (!button.dataset.baseText) {
        button.dataset.baseText = button.textContent.trim();
      }
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = pendingText;
      return;
    }
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.baseText) {
      button.textContent = button.dataset.baseText;
    }
  }

  function toUserError(message, fallback = 'Не удалось выполнить действие. Попробуйте еще раз.') {
    const text = String(message || '').trim();
    if (!text) return fallback;
    const normalized = text.toLowerCase();

    if (normalized.includes('invalid credentials')) return 'Неверный логин или пароль.';
    if (normalized.includes('login already exists')) return 'Пользователь с таким логином уже существует.';
    if (normalized.includes('login must contain 3-32')) return 'Логин: 3-32 символа, только латиница, цифры, ".", "_" и "-".';
    if (normalized.includes('password must contain 8-72')) return 'Пароль должен содержать от 8 до 72 символов.';
    if (normalized.includes('invalid login or password format')) return 'Проверьте формат логина и пароля.';
    if (normalized.includes('service_id is required')) return 'Выберите услугу перед отправкой заявки.';
    if (normalized.includes('service_id must be a positive integer')) return 'Выберите корректную услугу из списка.';
    if (normalized.includes('service_id does not exist')) return 'Услуга с таким ID не найдена.';
    if (normalized.includes('service not found')) return 'Выбранная услуга не найдена. Обновите страницу и попробуйте снова.';
    if (normalized.includes('contact_name must contain at least 2 characters')) return 'Укажите контактное лицо (минимум 2 символа).';
    if (normalized.includes('contact_email must be a valid email address')) return 'Укажите корректный email для связи.';
    if (normalized.includes('contact_phone must be 7-32 chars')) return 'Укажите корректный телефон для связи.';
    if (normalized.includes('comment must be at least 12 characters')) return 'Комментарий должен быть не короче 12 символов или оставлен пустым.';
    if (normalized.includes('title, image_url, description are required')) return 'Заполните обязательные поля кейса.';
    if (normalized.includes('name, price, category, description are required')) return 'Заполните все поля услуги.';
    if (isAuthError(text)) return 'Сессия истекла. Войдите в аккаунт заново.';
    if (normalized.includes('admin access required')) return 'Недостаточно прав для этого действия.';
    if (normalized.includes('forbidden')) return 'Нет прав для просмотра этой заявки.';

    return text;
  }

  function initTopOnReload() {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScrollTop = () => {
      window.scrollTo(0, 0);
    };

    const hasHash = Boolean(window.location.hash);
    if (!hasHash) {
      resetScrollTop();
      window.requestAnimationFrame(resetScrollTop);
      window.setTimeout(resetScrollTop, 0);
    }

    window.addEventListener('load', () => {
      if (!window.location.hash) {
        resetScrollTop();
      }
    }, { once: true });

    window.addEventListener('pageshow', (event) => {
      if (!window.location.hash && event.persisted) {
        resetScrollTop();
      }
    });
  }

  function getStatusMeta(status) {
    return STATUS_META[status] || STATUS_META.new;
  }

  function getClientApplicationLabel(row) {
    const number = Number(row?.client_application_number || row?.id);
    return Number.isInteger(number) && number > 0 ? `#${number}` : '#—';
  }

  function withClientApplicationNumbers(rows) {
    const orderedRows = [...rows].sort((a, b) => {
      const aDate = Date.parse(a.created_at || '') || 0;
      const bDate = Date.parse(b.created_at || '') || 0;
      return aDate - bDate || Number(a.id) - Number(b.id);
    });
    const numbersById = new Map();
    orderedRows.forEach((row, index) => {
      numbersById.set(Number(row.id), index + 1);
    });

    return rows.map((row) => {
      const serverNumber = Number(row.client_application_number);
      return {
        ...row,
        client_application_number: Number.isInteger(serverNumber) && serverNumber > 0
          ? serverNumber
          : numbersById.get(Number(row.id)),
      };
    });
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (options.auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || `HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      if (options.auth && (response.status === 401 || isAuthError(message))) {
        redirectToLogin();
      }
      throw error;
    }
    return data;
  }

  function initUiEffects() {
    const nav = document.querySelector('.navbar');
    const onScroll = () => {
      if (!nav) return;
      nav.classList.toggle('scrolled', window.scrollY > 18);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const nodes = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && nodes.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = Number(entry.target.dataset.revealDelay || 0);
            if (!Number.isNaN(delay) && delay > 0) {
              entry.target.style.transitionDelay = `${delay}ms`;
            }
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14 });
      nodes.forEach((n) => io.observe(n));
    } else {
      nodes.forEach((n) => n.classList.add('in'));
    }
  }

  function initMotionStagger() {
    const assignDelays = (selector, step = 80, cap = 8) => {
      document.querySelectorAll(selector).forEach((group) => {
        const items = Array.from(group.children).filter((node) => node.nodeType === 1);
        items.forEach((item, index) => {
          item.classList.add('wh-motion');
          item.style.setProperty('--motion-delay', `${Math.min(index, cap) * step}ms`);
        });
      });
    };

    assignDelays('.wh-split-body', 90, 8);
    assignDelays('.wh-about-grid', 110, 4);
    assignDelays('.wh-projects-grid', 110, 4);
    assignDelays('.wh-showcase-split', 110, 4);
    assignDelays('.wh-stats', 90, 6);
    assignDelays('.wh-services-grid', 70, 8);
    assignDelays('.wh-project-meta', 80, 6);
    assignDelays('.wh-reasons-layout', 110, 4);
    assignDelays('.wh-reasons-intro', 90, 8);
    assignDelays('.wh-reviews-split', 110, 4);
    assignDelays('.wh-reviews-body', 90, 8);
    assignDelays('.wh-reviews-head', 90, 4);
    assignDelays('.wh-reasons-list', 90, 8);
    assignDelays('.wh-review-tags', 70, 8);

    document.querySelectorAll('.wh-projects-nav .wh-project-item').forEach((item, index) => {
      item.classList.add('wh-motion');
      item.style.setProperty('--motion-delay', `${index * 80}ms`);
    });

    const reviewPanel = document.querySelector('.wh-reviews-panel');
    if (reviewPanel) {
      Array.from(reviewPanel.children).forEach((item, index) => {
        item.classList.add('wh-motion');
        item.style.setProperty('--motion-delay', `${index * 90}ms`);
      });
    }

    document
      .querySelectorAll('.wh-service-col li, .wh-stat, .wh-review-nav, .wh-reason-item, .wh-showcase-body .wh-lead, .wh-project-meta p')
      .forEach((item, index) => {
        item.classList.add('wh-motion');
        item.style.setProperty('--motion-delay', `${(index % 10) * 55}ms`);
      });
  }

  function initGenericStagger() {
    document.querySelectorAll('[data-stagger]').forEach((group) => {
      applyMotionToChildren(group, 85);
    });
  }

  function initMenuCurrentLink() {
    const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.menu-screen-list a').forEach((link) => {
      const href = (link.getAttribute('href') || '').split('#')[0].toLowerCase();
      if (!href) return;
      if (href === current || (current === '' && href === 'index.html')) {
        link.classList.add('is-current');
      }
    });
  }

  function initParallaxMotion() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const scenes = [
      { section: document.querySelector('.wh-hero'), background: document.querySelector('.wh-hero-bg'), strength: 0.08 },
      { section: document.querySelector('.wh-showcase'), background: document.querySelector('.wh-showcase-bg'), strength: 0.07 },
      { section: document.querySelector('.wh-reasons'), background: document.querySelector('.wh-reasons-bg'), strength: 0.06 },
    ].filter((scene) => scene.section && scene.background);

    if (!scenes.length) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const vh = window.innerHeight || 1;
        scenes.forEach((scene) => {
          const rect = scene.section.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          const viewportCenter = vh / 2;
          const normalized = (sectionCenter - viewportCenter) / vh;
          const translateY = normalized * scene.strength * -100;
          scene.background.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale(1.03)`;
        });
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  function initSidebar() {
    const toggle = byId('menuToggle');
    const overlay = byId('menuOverlay');
    const screen = byId('menuScreen');
    if (!toggle || !overlay || !screen) return;

    const openMenu = () => {
      document.body.classList.add('menu-open');
      screen.setAttribute('aria-hidden', 'false');
      overlay.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
      document.body.classList.remove('menu-open');
      screen.setAttribute('aria-hidden', 'true');
      overlay.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
      if (document.body.classList.contains('menu-open')) closeMenu();
      else openMenu();
    });
    overlay.addEventListener('click', closeMenu);
    screen.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
    });
  }

  function bindLogout() {
    document.querySelectorAll('[data-logout]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        clearSession();
        window.location.href = 'login.html';
      });
    });
  }

  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-password');
        const field = byId(targetId);
        if (!field) return;
        const isHidden = field.type === 'password';
        field.type = isHidden ? 'text' : 'password';
        btn.textContent = isHidden ? 'Скрыть' : 'Показать';
      });
    });
  }

  function isCaptureMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('capture') === '1';
  }

  function initCaptureMode() {
    if (!isCaptureMode()) return false;
    document.documentElement.classList.add('wh-capture-mode');
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    return true;
  }

  function applyRoleVisibility() {
    const user = getUser();
    const isAuth = Boolean(user);
    const isAdmin = user?.role === 'admin';

    document.querySelectorAll('[data-auth-only]').forEach((el) => {
      el.style.display = isAuth ? '' : 'none';
    });

    document.querySelectorAll('[data-guest-only]').forEach((el) => {
      el.style.display = isAuth ? 'none' : '';
    });

    document.querySelectorAll('[data-admin-only]').forEach((el) => {
      el.style.display = isAdmin ? '' : 'none';
    });
  }

  function serviceCard(item) {
    const id = Number(item.id);
    return `
      <article class="wh-service-text">
        <div>
          <p class="wh-service-category">${escapeHtml(item.category)}</p>
          <h3 class="wh-service-title">${escapeHtml(item.name)}</h3>
        </div>
        <p class="wh-service-desc">${escapeHtml(item.description)}</p>
        <div class="wh-service-meta">
          <div>
            <p class="wh-service-price">от ${Number(item.price).toLocaleString('ru-RU')} ₽</p>
            <span class="wh-service-price-note">стартовая цена</span>
          </div>
          <a class="wh-service-link" href="service.html?id=${Number.isInteger(id) ? id : ''}">Подробнее</a>
        </div>
      </article>
    `;
  }

  function resolvePortfolioImage(item = {}) {
    const raw = item.image_url || item.image || '';
    if (!raw || String(raw).includes('hero-project-preview')) {
      const match = featuredPortfolioData.find((project) => project.title.toLowerCase() === String(item.title || '').toLowerCase());
      return match?.image_url || 'assets/img/opitclab.webp';
    }
    return safeImageUrl(raw);
  }

  function resolvePortfolioStack(item = {}) {
    const featuredMatch = featuredPortfolioData.find(
      (project) => project.title.toLowerCase() === String(item.title || '').toLowerCase()
    );
    if (Array.isArray(featuredMatch?.stack) && featuredMatch.stack.length) {
      return featuredMatch.stack;
    }

    if (Array.isArray(item.stack) && item.stack.length) return item.stack;
    if (Array.isArray(item.tech_stack) && item.tech_stack.length) return item.tech_stack;

    const serviceName = String(item.service_name || '').toLowerCase();
    if (serviceName.includes('landing')) return ['Webflow', 'GSAP', 'Airtable'];
    if (serviceName.includes('корпоратив')) return ['Next.js', 'Prisma', 'Supabase'];
    if (serviceName.includes('store') || serviceName.includes('магазин') || serviceName.includes('каталог')) {
      return ['React', 'Stripe', 'MongoDB'];
    }
    if (serviceName.includes('design') || serviceName.includes('ux') || serviceName.includes('ui')) {
      return ['Figma', 'Framer', 'Tilda'];
    }

    const fallbackStacks = [
      ['React', 'Supabase', 'Prisma'],
      ['Vue 3', 'Firebase', 'Cloud Functions'],
      ['SvelteKit', 'PocketBase', 'SQLite'],
      ['Nuxt', 'Directus', 'MySQL'],
    ];
    const title = String(item.title || '');
    const hash = Array.from(title).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return fallbackStacks[hash % fallbackStacks.length];
  }

  function portfolioCard(item) {
    const image = safeImageUrl(resolvePortfolioImage(item));
    const stack = resolvePortfolioStack(item);
    return `
      <article class="card portfolio-card">
        <div class="portfolio-image" style="background-image:linear-gradient(145deg, rgba(59,130,246,.35), rgba(16,185,129,.28)), url('${escapeHtml(image)}'); background-size:cover; background-position:center;"></div>
        <div class="portfolio-overlay">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="muted">${escapeHtml(item.service_name || 'Web Project')}</p>
          <p class="muted">${escapeHtml(item.description || '')}</p>
          <div class="stack">${stack.map((tech) => `<span>${escapeHtml(tech)}</span>`).join('')}</div>
        </div>
      </article>
    `;
  }

  async function initHome() {
    const servicesGrid = byId('homeServicesGrid');
    const portfolioGrid = byId('homePortfolioGrid');
    if (!servicesGrid && !portfolioGrid) return;

    try {
      if (servicesGrid) {
        const services = await api('/services');
        servicesGrid.innerHTML = services.slice(0, 3).map(serviceCard).join('');
        applyMotionToChildren(servicesGrid, 80);
      }
      if (portfolioGrid) {
        const items = await api('/portfolio');
        portfolioGrid.innerHTML = items.slice(0, 3).map(portfolioCard).join('');
        applyMotionToChildren(portfolioGrid, 80);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function initProjectsShowcase() {
    const showcase = byId('projectsShowcase');
    const previewCard = byId('projectPreviewCard');
    const previewImage = byId('projectPreviewImage');
    const previewTitle = byId('projectPreviewTitle');
    const previewText = byId('projectPreviewText');
    if (!showcase || !previewCard || !previewImage || !previewTitle || !previewText) return;

    const buttons = Array.from(showcase.querySelectorAll('.wh-project-item'));
    if (!buttons.length) return;

    let activeIndex = Math.max(0, buttons.findIndex((item) => item.classList.contains('is-active')));
    let autoSwitchTimer = null;

    const scheduleAutoSwitch = () => {
      if (autoSwitchTimer) clearInterval(autoSwitchTimer);
      autoSwitchTimer = setInterval(() => {
        activeIndex = (activeIndex + 1) % buttons.length;
        switchPreview(buttons[activeIndex]);
      }, 10000);
    };

    const switchPreview = (btn) => {
      buttons.forEach((item) => item.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeIndex = buttons.indexOf(btn);

      previewCard.classList.add('is-switching');
      setTimeout(() => {
        previewImage.src = btn.dataset.previewImage || previewImage.src;
        previewImage.alt = `Превью проекта ${btn.dataset.previewTitle || ''}`.trim();
        previewTitle.textContent = btn.dataset.previewTitle || '';
        previewText.textContent = btn.dataset.previewText || '';
        previewCard.classList.remove('is-switching');
      }, 160);
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        switchPreview(btn);
        scheduleAutoSwitch();
      });
    });

    showcase.addEventListener('mouseenter', () => {
      if (autoSwitchTimer) clearInterval(autoSwitchTimer);
    });
    showcase.addEventListener('mouseleave', scheduleAutoSwitch);

    scheduleAutoSwitch();
  }

  function initReviewsShowcase() {
    const quoteEl = byId('reviewQuote');
    const nameEl = byId('reviewName');
    const roleEl = byId('reviewRole');
    const companyEl = byId('reviewCompany');
    const counterEl = byId('reviewCounter');
    const panelEl = document.querySelector('.wh-reviews-panel');
    if (!quoteEl || !nameEl || !roleEl || !companyEl || !counterEl || !panelEl) return;

    const tags = Array.from(document.querySelectorAll('.wh-review-tag'));
    const navButtons = Array.from(document.querySelectorAll('[data-review-nav]'));
    if (!tags.length) return;

    let index = Math.max(0, tags.findIndex((tag) => tag.classList.contains('is-active')));
    let switchTimeout = null;
    let releaseTimeout = null;

    const renderReview = (nextIndex) => {
      index = (nextIndex + tags.length) % tags.length;
      const active = tags[index];

      tags.forEach((tag) => tag.classList.remove('is-active'));
      active.classList.add('is-active');

      quoteEl.textContent = `«${active.dataset.reviewQuote || ''}»`;
      nameEl.textContent = active.dataset.reviewName || '';
      roleEl.textContent = active.dataset.reviewRole || '';
      companyEl.textContent = active.dataset.reviewCompany || '';
      counterEl.textContent = `${index + 1} / ${tags.length}`;
    };

    const resetPanelAnimation = () => {
      if (switchTimeout) {
        clearTimeout(switchTimeout);
        switchTimeout = null;
      }
      if (releaseTimeout) {
        clearTimeout(releaseTimeout);
        releaseTimeout = null;
      }
      panelEl.classList.remove('is-switching', 'is-entering');
    };

    const applyReview = (nextIndex, immediate = false) => {
      if (immediate) {
        resetPanelAnimation();
        renderReview(nextIndex);
        return;
      }
      resetPanelAnimation();
      panelEl.classList.add('is-switching');
      switchTimeout = setTimeout(() => {
        renderReview(nextIndex);
        panelEl.classList.remove('is-switching');
        panelEl.classList.add('is-entering');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            panelEl.classList.remove('is-entering');
          });
        });
        releaseTimeout = setTimeout(() => {
          panelEl.classList.remove('is-entering');
        }, 620);
      }, 340);
    };

    tags.forEach((tag, tagIndex) => {
      tag.addEventListener('click', () => applyReview(tagIndex));
    });

    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = Number(btn.dataset.reviewNav || 0);
        if (!step) return;
        applyReview(index + step);
      });
    });
  }

  function initReasonsFade() {
    const section = document.querySelector('.wh-reasons');
    const background = document.querySelector('.wh-reasons-bg');
    if (!section || !background) return;

    let ticking = false;
    const updateFade = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;

      const startPoint = viewport * 0.16;
      const distance = rect.height + viewport * 0.36;
      const rawProgress = (startPoint - rect.top) / distance;
      const progress = Math.min(1, Math.max(0, rawProgress));
      const opacity = Math.max(0, 1 - progress * 1.55);

      section.style.setProperty('--reasons-bg-opacity', opacity.toFixed(3));
      section.classList.toggle('is-fading', progress > 0.4);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateFade);
    };

    updateFade();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  function initWorkflowRoad() {
    const roadmap = byId('workflowRoadmap');
    if (!roadmap) return;

    const steps = Array.from(roadmap.querySelectorAll('[data-road-step]'));
    if (!steps.length) return;

    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      steps.forEach((step) => step.classList.add('is-visible'));
      roadmap.style.setProperty('--road-progress', '1');
      return;
    }

    steps.forEach((step, idx) => {
      step.style.transitionDuration = '1.15s';
      step.style.transitionDelay = `${idx * 120}ms`;
    });

    const seen = new Set();
    const updateRoadProgress = () => {
      if (steps.length === 1) {
        roadmap.style.setProperty('--road-progress', '1');
        return;
      }
      const ratio = Math.max(0, (seen.size - 1) / (steps.length - 1));
      roadmap.style.setProperty('--road-progress', ratio.toFixed(3));
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = steps.indexOf(entry.target);
        if (idx >= 0) {
          seen.add(idx);
          entry.target.classList.add('is-visible');
          updateRoadProgress();
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3, rootMargin: '0px 0px -2% 0px' });

    steps.forEach((step, idx) => {
      if (idx === 0) {
        step.classList.add('is-visible');
        seen.add(0);
      }
      io.observe(step);
    });

    updateRoadProgress();
  }

  async function initCatalog() {
    const grid = byId('servicesGrid');
    if (!grid) return;

    const searchInput = byId('searchInput');
    const categorySelect = byId('categorySelect');
    const minPriceInput = byId('minPriceInput');
    const maxPriceInput = byId('maxPriceInput');

    async function loadServices() {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
      if (categorySelect.value) params.set('category', categorySelect.value);
      if (minPriceInput.value) params.set('minPrice', minPriceInput.value);
      if (maxPriceInput.value) params.set('maxPrice', maxPriceInput.value);

      try {
        const list = await api(`/services?${params.toString()}`);
        grid.innerHTML = list.length
          ? list.map(serviceCard).join('')
          : '<div class="panel">По вашему фильтру услуги не найдены.</div>';
        applyMotionToChildren(grid, 75);
      } catch (err) {
        grid.innerHTML = `<div class="panel">Ошибка загрузки: ${escapeHtml(err.message)}</div>`;
        applyMotionToChildren(grid, 75);
      }
    }

    [searchInput, categorySelect, minPriceInput, maxPriceInput].forEach((el) => {
      el.addEventListener('input', loadServices);
      el.addEventListener('change', loadServices);
    });

    await loadServices();
  }

  async function initService() {
    const form = byId('applicationForm');
    if (!form) return;

    const message = byId('applicationMessage');
    const serviceSelect = byId('applicationServiceSelect');
    const contactNameField = byId('applicationContactName');
    const contactEmailField = byId('applicationContactEmail');
    const contactPhoneField = byId('applicationContactPhone');
    const commentField = byId('applicationComment');
    const submitButton = form.querySelector('button[type="submit"]');
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get('id');
    const serviceId = rawId ? Number(rawId) : null;
    let services = [];

    try {
      services = await api('/services');
      if (serviceSelect) {
        serviceSelect.innerHTML = `
          <option value="">Выберите услугу</option>
          ${services.map((item) => `<option value="${Number(item.id)}">${escapeHtml(item.name)} · от ${Number(item.price).toLocaleString('ru-RU')} ₽</option>`).join('')}
        `;
      }

      if (serviceId) {
        const service = await api(`/services/${serviceId}`);
        byId('serviceTitle').textContent = service.name;
        byId('serviceDescription').textContent = service.description;
        byId('servicePrice').textContent = `Стартовая цена: от ${Number(service.price).toLocaleString('ru-RU')} ₽`;
        if (serviceSelect) serviceSelect.value = String(service.id);
      } else {
        byId('servicePrice').textContent = '';
      }
    } catch (err) {
      showMessage(message, `Не удалось загрузить услуги: ${toUserError(err.message, 'Не удалось загрузить список услуг.')}`, 'error');
    }

    const currentUser = getUser();
    if (contactNameField && currentUser?.login) {
      contactNameField.value = currentUser.login;
    }

    [serviceSelect, contactNameField, contactEmailField, contactPhoneField, commentField].forEach((field) => {
      if (!field) return;
      field.addEventListener('input', () => clearMessage(message));
      field.addEventListener('change', () => clearMessage(message));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = getToken();
      if (!token) {
        showMessage(message, 'Для отправки заявки нужно войти в аккаунт. Перенаправляем на страницу входа...', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 700);
        return;
      }

      const service_id = Number(serviceSelect?.value || 0);
      const contact_name = String(contactNameField?.value || '').trim();
      const contact_email = String(contactEmailField?.value || '').trim();
      const contact_phone = String(contactPhoneField?.value || '').trim();
      const comment = String(commentField?.value || '').trim();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRe = /^[0-9+\-() ]{7,32}$/;

      if (!Number.isInteger(service_id) || service_id < 1) {
        showMessage(message, 'Выберите услугу перед отправкой заявки.', 'error');
        return;
      }
      if (contact_name.length < 2) {
        showMessage(message, 'Укажите контактное лицо (минимум 2 символа).', 'error');
        return;
      }
      if (!emailRe.test(contact_email)) {
        showMessage(message, 'Укажите корректный email для связи.', 'error');
        return;
      }
      if (!phoneRe.test(contact_phone)) {
        showMessage(message, 'Укажите корректный телефон для связи.', 'error');
        return;
      }

      if (comment && comment.length < 12) {
        showMessage(message, 'Комментарий слишком короткий. Добавьте хотя бы 12 символов или оставьте поле пустым.', 'error');
        return;
      }

      try {
        setButtonPending(submitButton, true, 'Отправляем...');
        const createdApplication = await api('/applications', {
          method: 'POST',
          body: {
            service_id,
            contact_name,
            contact_email,
            contact_phone,
            comment: comment || null,
          },
          auth: true,
        });
        showMessage(message, `Заявка ${getClientApplicationLabel(createdApplication)} отправлена. Мы свяжемся с вами в ближайшее время.`, 'success');
        form.reset();
        if (serviceId && serviceSelect) {
          serviceSelect.value = String(serviceId);
        }
        if (contactNameField && currentUser?.login) {
          contactNameField.value = currentUser.login;
        }
      } catch (err) {
        showMessage(message, `Ошибка отправки: ${toUserError(err.message)}`, 'error');
      } finally {
        setButtonPending(submitButton, false);
      }
    });
  }

  async function initPortfolio() {
    const grid = byId('portfolioGrid');
    if (!grid) return;

    try {
      const apiItems = await api('/portfolio');
      const merged = [...featuredPortfolioData, ...apiItems];
      const unique = merged.filter((item, index, arr) => (
        index === arr.findIndex((entry) => entry.title === item.title)
      ));

      grid.innerHTML = unique.length
        ? unique.map(portfolioCard).join('')
        : '<div class="panel">Портфолио пока пустое.</div>';
      applyMotionToChildren(grid, 75);
    } catch (err) {
      grid.innerHTML = featuredPortfolioData.map(portfolioCard).join('');
      applyMotionToChildren(grid, 75);
    }
  }

  function initRegister() {
    const form = byId('registerForm');
    if (!form) return;

    const message = byId('registerMessage');
    const submitButton = form.querySelector('button[type="submit"]');
    const loginPattern = /^[A-Za-z0-9._-]{3,32}$/;

    form.querySelectorAll('input').forEach((field) => {
      field.addEventListener('input', () => clearMessage(message));
      field.addEventListener('change', () => clearMessage(message));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const login = form.login.value.trim();
      const password = form.password.value;
      const confirm = form.confirmPassword.value;
      const consent = byId('registerConsent');

      if (!loginPattern.test(login)) {
        showMessage(message, 'Логин: 3-32 символа, только латиница, цифры, ".", "_" и "-".', 'error');
        return;
      }

      if (password.length < 8 || password.length > 72) {
        showMessage(message, 'Пароль должен содержать от 8 до 72 символов.', 'error');
        return;
      }

      if (password !== confirm) {
        showMessage(message, 'Пароли не совпадают.', 'error');
        return;
      }

      if (consent && !consent.checked) {
        showMessage(message, 'Нужно подтвердить согласие на обработку данных.', 'error');
        return;
      }

      try {
        setButtonPending(submitButton, true, 'Создаем аккаунт...');
        const data = await api('/auth/register', {
          method: 'POST',
          body: { login, password },
        });
        setSession(data.token, data.user);
        showMessage(message, 'Регистрация успешна. Переход в кабинет...', 'success');
        setTimeout(() => {
          window.location.href = 'cabinet.html';
        }, 500);
      } catch (err) {
        showMessage(message, `Ошибка регистрации: ${toUserError(err.message)}`, 'error');
      } finally {
        setButtonPending(submitButton, false);
      }
    });
  }

  function initLogin() {
    const form = byId('loginForm');
    if (!form) return;

    const message = byId('loginMessage');
    const submitButton = form.querySelector('button[type="submit"]');

    form.querySelectorAll('input').forEach((field) => {
      field.addEventListener('input', () => clearMessage(message));
      field.addEventListener('change', () => clearMessage(message));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const login = form.login.value.trim();
      const password = form.password.value;

      if (login.length < 3 || password.length < 8 || password.length > 72) {
        showMessage(message, 'Логин должен быть от 3 символов, пароль от 8 до 72 символов.', 'error');
        return;
      }

      try {
        setButtonPending(submitButton, true, 'Входим...');
        const data = await api('/auth/login', {
          method: 'POST',
          body: { login, password },
        });
        setSession(data.token, data.user);
        showMessage(message, 'Вход выполнен.', 'success');
        setTimeout(() => {
          window.location.href = data.user.role === 'admin' ? 'admin.html' : 'cabinet.html';
        }, 300);
      } catch (err) {
        showMessage(message, `Ошибка входа: ${toUserError(err.message)}`, 'error');
      } finally {
        setButtonPending(submitButton, false);
      }
    });
  }

  async function initCabinet() {
    const body = byId('applicationsBody');
    if (!body) return;
    const greeting = byId('cabinetGreeting');
    const recentList = byId('cabinetRecentList');
    const totalCount = byId('cabinetTotalCount');
    const newCount = byId('cabinetNewCount');
    const workCount = byId('cabinetWorkCount');
    const doneCount = byId('cabinetDoneCount');
    const updatedAt = byId('cabinetUpdatedAt');
    const historyPanel = byId('cabinetHistoryPanel');
    const historyAppId = byId('cabinetHistoryAppId');
    const historyList = byId('cabinetHistoryList');
    const rowsById = new Map();

    const user = getUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const profileLogin = byId('profileLogin');
    const profileRole = byId('profileRole');
    if (profileLogin) profileLogin.textContent = user.login;
    if (profileRole) profileRole.textContent = user.role;
    if (greeting) greeting.textContent = `Здравствуйте, ${user.login}!`;

    const updateCabinetSummary = (rows) => {
      const summary = rows.reduce((acc, row) => {
        acc.total += 1;
        if (row.status === 'new') acc.new += 1;
        if (row.status === 'work') acc.work += 1;
        if (row.status === 'done') acc.done += 1;
        return acc;
      }, { total: 0, new: 0, work: 0, done: 0 });

      if (totalCount) totalCount.textContent = String(summary.total);
      if (newCount) newCount.textContent = String(summary.new);
      if (workCount) workCount.textContent = String(summary.work);
      if (doneCount) doneCount.textContent = String(summary.done);

      const latest = rows[0];
      if (updatedAt) {
        updatedAt.textContent = latest
          ? new Date(latest.status_updated_at || latest.created_at).toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })
          : '—';
      }
    };

    const renderRecentApplications = (rows) => {
      if (!recentList) return;
      if (!rows.length) {
        recentList.innerHTML = '<li class="wh-cabinet-feed-empty">Пока нет заявок. Выберите услугу и отправьте первую заявку.</li>';
        return;
      }

      recentList.innerHTML = rows.slice(0, 4).map((row) => {
        const meta = getStatusMeta(row.status);
        const applicationLabel = getClientApplicationLabel(row);
        return `
          <li class="wh-cabinet-feed-item">
            <div class="wh-cabinet-feed-meta">
              <strong>${applicationLabel}</strong>
              <span class="badge ${meta.badgeClass}">${meta.label}</span>
            </div>
            <p class="wh-cabinet-feed-service">${escapeHtml(row.service_name)}</p>
            <p class="wh-cabinet-feed-date">${new Date(row.created_at).toLocaleDateString('ru-RU')}</p>
          </li>
        `;
      }).join('');
    };

    const renderApplicationHistory = (historyRows) => {
      if (!historyList) return;
      if (!historyRows.length) {
        historyList.innerHTML = '<li class="wh-cabinet-history-empty">Пока нет истории изменений.</li>';
        return;
      }
      historyList.innerHTML = historyRows.map((item) => {
        const meta = getStatusMeta(item.new_status);
        const oldMeta = item.old_status ? getStatusMeta(item.old_status) : null;
        const dateText = new Date(item.changed_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const text = oldMeta
          ? `${oldMeta.label} -> ${meta.label}`
          : `Создана со статусом «${meta.label}»`;
        return `<li><b>${escapeHtml(text)}</b><span>${escapeHtml(dateText)}</span></li>`;
      }).join('');
    };

    const openHistory = async (applicationId) => {
      if (!historyPanel || !historyAppId || !historyList) return;
      const row = rowsById.get(applicationId);
      if (!row) return;
      historyPanel.hidden = false;
      historyAppId.textContent = getClientApplicationLabel(row);
      historyList.innerHTML = '<li class="wh-cabinet-history-empty">Загрузка...</li>';

      try {
        const historyRows = await api(`/applications/${applicationId}/history`, { auth: true });
        renderApplicationHistory(historyRows);
      } catch (err) {
        historyList.innerHTML = `<li class="wh-cabinet-history-empty">Ошибка загрузки: ${escapeHtml(toUserError(err.message))}</li>`;
      }
    };

    body.addEventListener('click', (event) => {
      const trigger = event.target.closest('button[data-open-history]');
      if (!trigger) return;
      const applicationId = Number(trigger.getAttribute('data-open-history'));
      if (!Number.isInteger(applicationId) || applicationId < 1) return;
      openHistory(applicationId);
    });

    try {
      const rows = withClientApplicationNumbers(await api('/applications', { auth: true }));
      rowsById.clear();
      rows.forEach((row) => rowsById.set(row.id, row));
      updateCabinetSummary(rows);
      renderRecentApplications(rows);
      body.innerHTML = rows.length
        ? rows.map((row) => {
          const meta = getStatusMeta(row.status);
          const applicationLabel = getClientApplicationLabel(row);
          const updatedDate = new Date(row.status_updated_at || row.created_at).toLocaleDateString('ru-RU');
          return `
          <tr>
            <td class="wh-cabinet-app-id" data-label="Заявка">${applicationLabel}</td>
            <td class="wh-cabinet-service-cell" data-label="Услуга">
              <span class="wh-cabinet-service-id">ID услуги: #${row.service_id}</span>
              <span class="wh-cabinet-service-name">${escapeHtml(row.service_name)}</span>
            </td>
            <td class="wh-cabinet-created-at" data-label="Дата">${new Date(row.created_at).toLocaleDateString('ru-RU')}</td>
            <td class="wh-cabinet-status-cell" data-label="Статус"><span class="badge ${meta.badgeClass}">${meta.label}</span></td>
            <td class="wh-cabinet-history-cell" data-label="История"><button class="btn wh-btn-flat" type="button" data-open-history="${row.id}">${updatedDate}</button></td>
          </tr>
        `;
        }).join('')
        : '<tr><td colspan="5">Заявок пока нет.</td></tr>';
    } catch (err) {
      body.innerHTML = `<tr><td colspan="5">Ошибка загрузки: ${escapeHtml(toUserError(err.message))}</td></tr>`;
      updateCabinetSummary([]);
      if (recentList) {
        recentList.innerHTML = '<li class="wh-cabinet-feed-empty">Не удалось загрузить последние заявки.</li>';
      }
      if (historyPanel) historyPanel.hidden = true;
    }
  }

  async function initAdmin() {
    const appBody = byId('adminApplicationsBody');
    if (!appBody) return;

    const user = getUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    if (user.role !== 'admin') {
      appBody.innerHTML = '<tr><td colspan="6">Только для администратора.</td></tr>';
      return;
    }

    const serviceForm = byId('serviceForm');
    const serviceBody = byId('adminServicesBody');
    const portfolioForm = byId('portfolioForm');
    const portfolioBody = byId('adminPortfolioBody');
    const message = byId('adminMessage');
    const statusFilter = byId('adminApplicationsStatusFilter');
    const detailsPanel = byId('adminApplicationDetails');
    const detailAppId = byId('adminDetailAppId');
    const detailLogin = byId('adminDetailLogin');
    const detailService = byId('adminDetailService');
    const detailName = byId('adminDetailName');
    const detailEmail = byId('adminDetailEmail');
    const detailPhone = byId('adminDetailPhone');
    const detailStatus = byId('adminDetailStatus');
    const detailComment = byId('adminDetailComment');
    const detailHistoryList = byId('adminDetailHistoryList');
    const serviceSubmitButton = serviceForm?.querySelector('button[type="submit"]');
    const portfolioSubmitButton = portfolioForm?.querySelector('button[type="submit"]');
    const applicationsById = new Map();
    const servicesById = new Map();
    const portfolioById = new Map();
    let editingServiceId = null;
    let editingPortfolioId = null;

    serviceForm?.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', () => clearMessage(message));
      field.addEventListener('change', () => clearMessage(message));
    });
    portfolioForm?.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', () => clearMessage(message));
      field.addEventListener('change', () => clearMessage(message));
    });

    const renderAdminHistory = (historyRows) => {
      if (!detailHistoryList) return;
      if (!historyRows.length) {
        detailHistoryList.innerHTML = '<li class="wh-admin-detail-empty">История изменений пока отсутствует.</li>';
        return;
      }
      detailHistoryList.innerHTML = historyRows.map((item) => {
        const oldMeta = item.old_status ? getStatusMeta(item.old_status) : null;
        const newMeta = getStatusMeta(item.new_status);
        const transition = oldMeta
          ? `${oldMeta.label} -> ${newMeta.label}`
          : `Создана со статусом «${newMeta.label}»`;
        const date = new Date(item.changed_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const author = item.changed_by_login || 'система';
        return `<li><b>${escapeHtml(transition)}</b><span>${escapeHtml(date)} · ${escapeHtml(author)}</span></li>`;
      }).join('');
    };

    const fillAdminDetails = (row) => {
      if (!detailsPanel) return;
      detailsPanel.hidden = false;
      detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (detailAppId) detailAppId.textContent = `#${row.id}`;
      if (detailLogin) detailLogin.textContent = row.login || '—';
      if (detailService) detailService.textContent = row.service_name || '—';
      if (detailName) detailName.textContent = row.contact_name || '—';
      if (detailEmail) detailEmail.textContent = row.contact_email || '—';
      if (detailPhone) detailPhone.textContent = row.contact_phone || '—';
      if (detailStatus) detailStatus.textContent = getStatusMeta(row.status).label;
      if (detailComment) detailComment.textContent = row.comment || 'Комментарий не указан';
      if (detailHistoryList) {
        detailHistoryList.innerHTML = '<li class="wh-admin-detail-empty">Загрузка истории...</li>';
      }
    };

    const openAdminDetails = async (applicationId) => {
      const row = applicationsById.get(applicationId);
      if (!row) return;
      fillAdminDetails(row);
      try {
        const historyRows = await api(`/applications/${applicationId}/history`, { auth: true });
        renderAdminHistory(historyRows);
      } catch (err) {
        if (detailHistoryList) {
          detailHistoryList.innerHTML = `<li class="wh-admin-detail-empty">Ошибка истории: ${escapeHtml(toUserError(err.message))}</li>`;
        }
      }
    };

    async function refreshServices() {
      const list = await api('/services');
      servicesById.clear();
      list.forEach((service) => servicesById.set(service.id, service));
      serviceBody.innerHTML = list.map((s) => `
        <tr>
          <td data-label="ID">${s.id}</td>
          <td data-label="Название">${escapeHtml(s.name)}</td>
          <td data-label="Категория">${escapeHtml(s.category)}</td>
          <td data-label="Стартовая цена">от ${Number(s.price).toLocaleString('ru-RU')} ₽</td>
          <td class="wh-admin-action-cell" data-label="Действие">
            <button class="btn" type="button" data-edit-service="${s.id}">Изменить</button>
            <button class="btn" type="button" data-delete-service="${s.id}">Удалить</button>
          </td>
        </tr>
      `).join('');
    }

    async function refreshPortfolio() {
      const list = await api('/portfolio');
      portfolioById.clear();
      list.forEach((item) => portfolioById.set(item.id, item));
      portfolioBody.innerHTML = list.map((p) => `
        <tr>
          <td data-label="ID">${p.id}</td>
          <td data-label="Название">${escapeHtml(p.title)}</td>
          <td data-label="Услуга">${escapeHtml(p.service_name || '-')}</td>
          <td class="wh-admin-action-cell" data-label="Действие">
            <button class="btn" type="button" data-edit-portfolio="${p.id}">Изменить</button>
            <button class="btn" type="button" data-delete-portfolio="${p.id}">Удалить</button>
          </td>
        </tr>
      `).join('');
    }

    function setServiceEditState(service = null) {
      editingServiceId = service?.id || null;
      if (!serviceForm || !serviceSubmitButton) return;

      serviceForm.name.value = service?.name || '';
      serviceForm.price.value = service?.price || '';
      serviceForm.category.value = service?.category || '';
      serviceForm.description.value = service?.description || '';
      serviceSubmitButton.textContent = service ? 'Сохранить услугу' : 'Добавить услугу';
      delete serviceSubmitButton.dataset.baseText;
      const cancelButton = byId('cancelServiceEdit');
      if (cancelButton) cancelButton.hidden = !service;
    }

    function setPortfolioEditState(item = null) {
      editingPortfolioId = item?.id || null;
      if (!portfolioForm || !portfolioSubmitButton) return;

      portfolioForm.title.value = item?.title || '';
      portfolioForm.service_id.value = item?.service_id || '';
      portfolioForm.image_url.value = item?.image_url || '';
      portfolioForm.description.value = item?.description || '';
      portfolioSubmitButton.textContent = item ? 'Сохранить кейс' : 'Добавить кейс';
      delete portfolioSubmitButton.dataset.baseText;
      const cancelButton = byId('cancelPortfolioEdit');
      if (cancelButton) cancelButton.hidden = !item;
    }

    async function refreshApplications() {
      const status = String(statusFilter?.value || '').trim();
      const query = status ? `/applications?status=${encodeURIComponent(status)}` : '/applications';
      const rows = await api(query, { auth: true });
      applicationsById.clear();
      rows.forEach((row) => applicationsById.set(row.id, row));
      appBody.innerHTML = rows.length
        ? rows.map((row) => {
          const meta = getStatusMeta(row.status);
          return `
          <tr>
            <td class="wh-admin-id-cell" data-label="ID">#${row.id}</td>
            <td class="wh-admin-client-cell" data-label="Клиент">${escapeHtml(row.login)}</td>
            <td class="wh-admin-details-cell" data-label="Детали">
              <button class="btn wh-btn-flat" type="button" data-open-application="${row.id}">Детали</button>
            </td>
            <td class="wh-admin-service-cell" data-label="Услуга">${escapeHtml(row.service_name)}</td>
            <td class="wh-admin-status-cell" data-label="Статус">
              <div class="wh-admin-status">
                <select data-status-id="${row.id}" data-current-status="${row.status}">
                  <option value="new" ${row.status === 'new' ? 'selected' : ''}>Новая</option>
                  <option value="work" ${row.status === 'work' ? 'selected' : ''}>В работе</option>
                  <option value="done" ${row.status === 'done' ? 'selected' : ''}>Выполнено</option>
                </select>
                <small class="wh-admin-status-note">Сейчас: ${meta.label}</small>
              </div>
            </td>
            <td class="wh-admin-action-cell" data-label="Действие">
              <button class="btn" data-save-status="${row.id}">Сохранить</button>
            </td>
          </tr>
        `;
        }).join('')
        : '<tr><td colspan="6">Заявок пока нет.</td></tr>';

      if (detailsPanel && !rows.length) {
        detailsPanel.hidden = true;
      }
    }

    serviceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = serviceForm.name.value.trim();
      const category = serviceForm.category.value.trim();
      const description = serviceForm.description.value.trim();
      const price = Number(serviceForm.price.value);

      if (name.length < 3) {
        showMessage(message, 'Название услуги должно быть не короче 3 символов.', 'error');
        return;
      }
      if (!Number.isFinite(price) || price <= 0) {
        showMessage(message, 'Укажите корректную стартовую цену услуги (больше 0).', 'error');
        return;
      }
      if (!category) {
        showMessage(message, 'Выберите категорию услуги.', 'error');
        return;
      }
      if (description.length < 10) {
        showMessage(message, 'Описание услуги должно быть минимум 10 символов.', 'error');
        return;
      }

      try {
        const editedId = editingServiceId;
        setButtonPending(serviceSubmitButton, true, editedId ? 'Сохраняем...' : 'Добавляем...');
        await api(editedId ? `/services/${editedId}` : '/services', {
          method: editedId ? 'PUT' : 'POST',
          auth: true,
          body: {
            name,
            price,
            category,
            description,
          },
        });
        setServiceEditState();
        await refreshServices();
        showMessage(message, editedId ? 'Услуга обновлена.' : 'Услуга добавлена.', 'success');
      } catch (err) {
        showMessage(message, `Ошибка услуги: ${toUserError(err.message)}`, 'error');
      } finally {
        setButtonPending(serviceSubmitButton, false);
      }
    });

    portfolioForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = portfolioForm.title.value.trim();
      const image = portfolioForm.image_url.value.trim() || 'assets/img/opitclab.webp';
      const serviceIdRaw = portfolioForm.service_id.value.trim();
      const service_id = serviceIdRaw ? Number(serviceIdRaw) : null;
      const description = portfolioForm.description.value.trim();

      if (title.length < 2) {
        showMessage(message, 'Название кейса должно быть минимум 2 символа.', 'error');
        return;
      }
      if (service_id !== null && (!Number.isInteger(service_id) || service_id < 1)) {
        showMessage(message, 'ID услуги должен быть целым числом больше 0.', 'error');
        return;
      }
      if (description.length < 10) {
        showMessage(message, 'Описание кейса должно быть минимум 10 символов.', 'error');
        return;
      }

      try {
        const editedId = editingPortfolioId;
        setButtonPending(portfolioSubmitButton, true, editedId ? 'Сохраняем...' : 'Добавляем...');
        await api(editedId ? `/portfolio/${editedId}` : '/portfolio', {
          method: editedId ? 'PUT' : 'POST',
          auth: true,
          body: {
            title,
            image_url: image,
            service_id,
            description,
          },
        });
        setPortfolioEditState();
        await refreshPortfolio();
        showMessage(message, editedId ? 'Кейс обновлен.' : 'Кейс добавлен.', 'success');
      } catch (err) {
        showMessage(message, `Ошибка кейса: ${toUserError(err.message)}`, 'error');
      } finally {
        setButtonPending(portfolioSubmitButton, false);
      }
    });

    statusFilter?.addEventListener('change', async () => {
      clearMessage(message);
      await refreshApplications();
      if (detailsPanel) detailsPanel.hidden = true;
    });

    byId('cancelServiceEdit')?.addEventListener('click', () => setServiceEditState());
    byId('cancelPortfolioEdit')?.addEventListener('click', () => setPortfolioEditState());

    document.addEventListener('click', async (e) => {
      const target = e.target.closest('button[data-edit-service], button[data-delete-service], button[data-edit-portfolio], button[data-delete-portfolio], button[data-save-status], button[data-open-application], button[data-close-application-details]');
      if (!target) return;

      const editedServiceId = Number(target.getAttribute('data-edit-service'));
      if (Number.isInteger(editedServiceId) && editedServiceId > 0) {
        const service = servicesById.get(editedServiceId);
        if (service) {
          setServiceEditState(service);
          serviceForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      const serviceId = target.getAttribute('data-delete-service');
      if (serviceId) {
        try {
          setButtonPending(target, true, 'Удаляем...');
          await api(`/services/${serviceId}`, { method: 'DELETE', auth: true });
          await refreshServices();
          showMessage(message, 'Услуга удалена.', 'success');
        } catch (err) {
          showMessage(message, toUserError(err.message), 'error');
        } finally {
          setButtonPending(target, false);
        }
      }

      const editedPortfolioId = Number(target.getAttribute('data-edit-portfolio'));
      if (Number.isInteger(editedPortfolioId) && editedPortfolioId > 0) {
        const item = portfolioById.get(editedPortfolioId);
        if (item) {
          setPortfolioEditState(item);
          portfolioForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      const portfolioId = target.getAttribute('data-delete-portfolio');
      if (portfolioId) {
        try {
          setButtonPending(target, true, 'Удаляем...');
          await api(`/portfolio/${portfolioId}`, { method: 'DELETE', auth: true });
          await refreshPortfolio();
          showMessage(message, 'Кейс удален.', 'success');
        } catch (err) {
          showMessage(message, toUserError(err.message), 'error');
        } finally {
          setButtonPending(target, false);
        }
      }

      const appId = target.getAttribute('data-save-status');
      if (appId) {
        const select = document.querySelector(`select[data-status-id="${appId}"]`);
        if (!select) {
          showMessage(message, 'Не удалось определить выбранный статус.', 'error');
          return;
        }

        const currentStatus = select.getAttribute('data-current-status') || '';
        if (select.value === currentStatus) {
          clearMessage(message);
          return;
        }

        try {
          setButtonPending(target, true, 'Сохраняем...');
          await api(`/applications/${appId}/status`, {
            method: 'PATCH',
            auth: true,
            body: { status: select.value },
          });
          await refreshApplications();
          const nextMeta = getStatusMeta(select.value);
          if (select.value === 'done') {
            showMessage(message, `Заявка #${appId} отмечена как «${nextMeta.label}».`, 'success');
          } else {
            clearMessage(message);
          }
          if (!detailsPanel?.hidden && Number(detailAppId?.textContent?.replace('#', '')) === Number(appId)) {
            await openAdminDetails(Number(appId));
          }
        } catch (err) {
          showMessage(message, toUserError(err.message), 'error');
        } finally {
          setButtonPending(target, false);
        }
      }

      const openId = target.getAttribute('data-open-application');
      if (openId) {
        await openAdminDetails(Number(openId));
      }

      if (target.hasAttribute('data-close-application-details') && detailsPanel) {
        detailsPanel.hidden = true;
      }
    });

    try {
      await refreshServices();
      await refreshPortfolio();
      await refreshApplications();
    } catch (err) {
      showMessage(message, `Ошибка загрузки админки: ${toUserError(err.message)}`, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const captureMode = initCaptureMode();
    initTopOnReload();
    if (!captureMode) {
      initUiEffects();
      initMotionStagger();
      initGenericStagger();
      initParallaxMotion();
    }
    initSidebar();
    initMenuCurrentLink();
    if (!captureMode) {
      initProjectsShowcase();
      initReviewsShowcase();
      initReasonsFade();
      initWorkflowRoad();
    }
    bindLogout();
    initPasswordToggles();
    applyRoleVisibility();

    initHome();
    initCatalog();
    initService();
    initPortfolio();
    initRegister();
    initLogin();
    initCabinet();
    initAdmin();
  });
})();
