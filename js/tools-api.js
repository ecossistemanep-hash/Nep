/**
 * NEXUS API TOOLS MODULE
 * Gerencia integrações com APIs externas: Clima (Open-Meteo), Notícias, Dicionário e Dados Brasil.
 */

class NexusAPITools {
    constructor() {
        this.container = document.getElementById('page-content');
        this.state = {
            weatherKey: '', // Not used for Open-Meteo
            newsKey: localStorage.getItem('nep_news_key') || 'f0ebc7af6a66c8701613ca085eda8851',
            currentCity: { name: 'São Paulo', lat: -23.5505, lon: -46.6333 }, // Default
            currentNewsTopic: 'breaking-news', // Filters
            banksCache: null
        };

        // Mapeamento de APIs
        this.apis = {
            weather: 'https://api.open-meteo.com/v1/forecast',
            geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
            news_br: 'https://gnews.io/api/v4/top-headlines?country=br',
            news_world: 'https://gnews.io/api/v4/top-headlines?lang=pt&topic=world', // Base for world, overrides topic
            dict: 'https://dicio-api-ten.vercel.app/v2',
            brasil: 'https://brasilapi.com.br/api'
        };

        this.newsCategories = [
            { id: 'breaking-news', label: 'Em geral' },
            { id: 'world', label: 'Mundo' },
            { id: 'nation', label: 'Nação' },
            { id: 'business', label: 'Negócios' },
            { id: 'technology', label: 'Tecnologia' },
            { id: 'entertainment', label: 'Entretenimento' },
            { id: 'sports', label: 'Esportes' },
            { id: 'science', label: 'Ciência' },
            { id: 'health', label: 'Saúde' }
        ];
    }

    // ==========================================
    // RENDERERS
    // ==========================================

    renderWeather() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="api-tool-container">
                <div class="api-header">
                    <div>
                        <h2>NEP Clima (Open-Meteo)</h2>
                        <div class="api-subtitle">Previsão Global de Alta Precisão</div>
                    </div>
                </div>

                <div class="weather-controls">
                    <div class="preset-cities">
                        <button class="city-btn" onclick="nexusAPITools.setCity('João Pessoa', -7.115, -34.863)">João Pessoa</button>
                        <button class="city-btn" onclick="nexusAPITools.setCity('Juazeiro do Norte', -7.202, -39.313)">Juazeiro do Norte</button>
                        <button class="city-btn" onclick="nexusAPITools.setCity('Mossoró', -5.188, -37.344)">Mossoró</button>
                    </div>
                    <div class="city-search">
                        <input type="text" id="city-input" placeholder="Buscar outra cidade..." onkeypress="if(event.key==='Enter') nexusAPITools.searchCity()">
                        <button onclick="nexusAPITools.searchCity()"><i class="fa-solid fa-search"></i></button>
                    </div>
                </div>

                <div id="weather-content" class="weather-widget">
                    <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</div>
                </div>
            </div>
        `;
        this.fetchWeather();
    }

    renderNews(type) {
        if (!this.container) return;
        const title = type === 'br' ? 'Brasil Updates' : 'Mundo em Foco';
        const subtitle = type === 'br' ? 'Manchetes nacionais em tempo real' : 'Giro de notícias globais em português';

        // Render Categories HTML
        const catsHTML = this.newsCategories.map(cat => `
            <button class="news-cat-btn ${this.state.currentNewsTopic === cat.id ? 'active' : ''}" 
                    onclick="nexusAPITools.filterNews('${type}', '${cat.id}')">
                ${cat.label}
            </button>
        `).join('');

        this.container.innerHTML = `
            <div class="api-tool-container">
                <div class="api-header">
                    <div>
                        <h2>${title}</h2>
                        <div class="api-subtitle">${subtitle}</div>
                    </div>
                </div>

                <div class="news-categories-wrap">
                    ${catsHTML}
                </div>

                <div id="news-content" class="news-grid">
                    <div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Buscando notícias...</div>
                </div>
            </div>
        `;

        // Reset topic if switching main views, or keep persistence? 
        // Let's reset to 'breaking-news' if it's first load of this view
        // But if user clicks filter, it updates state.
        this.fetchNews(type, this.state.currentNewsTopic);
    }

    renderDictionary() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="api-tool-container">
                <div class="api-header">
                    <div>
                        <h2>NEP Dicionário</h2>
                        <div class="api-subtitle">Consulta Lexicográfica Avançada</div>
                    </div>
                </div>

                <div class="dict-search-box">
                    <input type="text" id="dict-input" class="dict-input" placeholder="Digite uma palavra..." onkeypress="if(event.key==='Enter') nexusAPITools.searchDict()">
                    <button class="dict-btn" onclick="nexusAPITools.searchDict()"><i class="fa-solid fa-magnifying-glass"></i> Buscar</button>
                </div>

                <div id="dict-result">
                    <div style="text-align:center; opacity:0.5; margin-top:40px">
                        <i class="fa-solid fa-book-open" style="font-size:4rem; margin-bottom:16px"></i>
                        <p>Busque por qualquer palavra em português.</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderBrasilData() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="api-tool-container">
                <div class="api-header">
                    <div>
                        <h2>NEP Brasil Data</h2>
                        <div class="api-subtitle">Inteligência de Dados Públicos (BrasilAPI)</div>
                    </div>
                </div>

                <div class="brasil-tabs">
                    <button class="brasil-tab active" onclick="nexusAPITools.switchTab('cep')">CEP</button>
                    <button class="brasil-tab" onclick="nexusAPITools.switchTab('cnpj')">CNPJ</button>
                    <button class="brasil-tab" onclick="nexusAPITools.switchTab('banks')">Bancos</button>
                    <button class="brasil-tab" onclick="nexusAPITools.switchTab('feriados')">Feriados</button>
                </div>

                <div id="brasil-content" class="brasil-content">
                    <!-- Default loaded via switchTab -->
                </div>
            </div>
        `;
        this.switchTab('cep');
    }

    // ==========================================
    // WEATHER LOGIC (OPEN-METEO)
    // ==========================================

    setCity(name, lat, lon) {
        this.state.currentCity = { name, lat, lon };
        this.renderWeather(); // Re-render to show updated weather
    }

    async searchCity() {
        const query = document.getElementById('city-input').value;
        if (!query) return;

        try {
            const res = await fetch(`${this.apis.geocoding}?name=${query}&count=1&language=pt&format=json`);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                const city = data.results[0];
                this.setCity(city.name, city.latitude, city.longitude);
            } else {
                alert('Cidade não encontrada.');
            }
        } catch (error) {
            alert('Erro ao buscar cidade.');
        }
    }

    async fetchWeather() {
        const { name, lat, lon } = this.state.currentCity;
        const el = document.getElementById('weather-content');

        try {
            // Fetch Open-Meteo
            const url = `${this.apis.weather}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();

            if (!data.current_weather) throw new Error('Dados indisponíveis');

            // Render
            const current = data.current_weather;
            const daily = data.daily;
            const iconClass = this.getWMOIcon(current.weathercode, current.is_day);

            // Forecast HTML
            let forecastHTML = '';
            if (daily && daily.time) {
                forecastHTML = daily.time.slice(0, 7).map((time, index) => {
                    const date = new Date(time);
                    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                    const code = daily.weathercode[index];
                    const min = Math.round(daily.temperature_2m_min[index]);
                    const max = Math.round(daily.temperature_2m_max[index]);

                    return `
                        <div class="forecast-item">
                            <div style="font-size:0.8rem; opacity:0.8; text-transform:uppercase">${weekday}</div>
                            <div style="font-size:1.5rem; margin:8px 0"><i class="fa-solid ${this.getWMOIcon(code)}"></i></div>
                            <div><strong>${max}°</strong> <span style="opacity:0.6">${min}°</span></div>
                        </div>
                    `;
                }).join('');
            }

            el.innerHTML = `
                <div class="weather-header">
                    <div class="weather-metric">
                        <span style="font-size:1.5rem"><i class="fa-solid fa-location-dot"></i> ${name}</span>
                        <div style="font-size:0.9rem; opacity:0.7">Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:center; align-items:center; gap:32px; margin: 20px 0;">
                    <i class="fa-solid ${iconClass} weather-icon-lg"></i>
                    <div class="weather-temp-main">${Math.round(current.temperature)}<span style="font-size:2rem">°C</span></div>
                </div>
                
                <div style="text-align:center; font-size:1.2rem; margin-bottom:24px; opacity:0.9">
                    ${this.getWMODescription(current.weathercode)}
                </div>

                <div class="weather-grid">
                    <div class="weather-metric">
                        <i class="fa-solid fa-wind"></i>
                        <span>${current.windspeed} km/h</span>
                        Vento
                    </div>
                    <div class="weather-metric">
                        <i class="fa-solid fa-compass"></i>
                        <span>${current.winddirection}°</span>
                        Direção
                    </div>
                </div>

                <div class="weather-forecast">
                    ${forecastHTML}
                </div>
            `;

        } catch (error) {
            el.innerHTML = `<div class="error-msg">Erro ao carregar dados: ${error.message}</div>`;
        }
    }

    getWMOIcon(code, isDay = 1) {
        if (code === 0) return isDay ? 'fa-sun' : 'fa-moon';
        if (code <= 3) return isDay ? 'fa-cloud-sun' : 'fa-cloud-moon';
        if (code <= 48) return 'fa-smog';
        if (code <= 67) return 'fa-cloud-rain';
        if (code <= 77) return 'fa-snowflake';
        if (code >= 95) return 'fa-cloud-bolt';
        return 'fa-cloud';
    }

    getWMODescription(code) {
        const map = {
            0: 'Céu Limpo',
            1: 'Predominantemente Limpo',
            2: 'Parcialmente Nublado',
            3: 'Encoberto',
            45: 'Nevoeiro',
            48: 'Nevoeiro com Geada',
            51: 'Garoa Leve',
            53: 'Garoa Moderada',
            55: 'Garoa Densa',
            61: 'Chuva Fraca',
            63: 'Chuva Moderada',
            65: 'Chuva Forte',
            80: 'Pancadas de Chuva',
            95: 'Tempestade Tropical'
        };
        return map[code] || 'Condição Desconhecida';
    }

    // ==========================================
    // NEWS LOGIC
    // ==========================================

    filterNews(type, topic) {
        this.state.currentNewsTopic = topic;
        this.renderNews(type); // Re-render to update active button class
        // fetchNews is called inside renderNews
    }

    async fetchNews(type, topic = 'breaking-news') {
        const apiKey = this.state.newsKey;
        if (!apiKey) {
            document.getElementById('news-content').innerHTML = `
                <div style="text-align:center; padding:40px">
                    <i class="fa-solid fa-key" style="font-size:3rem; margin-bottom:16px; opacity:0.5"></i>
                    <h3>API Key Necessária</h3>
                    <p>Configure sua chave da GNews.</p>
                    <button class="tools-btn-primary" onclick="nexusAPITools.configureKeys('news')">Configurar</button>
                </div>`;
            return;
        }

        // Construct URL
        // Brasil: country=br
        // World: lang=pt (because country param overrides global focus sometimes, unless mixed. 'topic' is safest)
        let url = '';
        if (type === 'br') {
            url = `${this.apis.news_br}&token=${apiKey}&topic=${topic}`;
        } else {
            // For world, allow topic but ensure lang=pt
            url = `https://gnews.io/api/v4/top-headlines?lang=pt&topic=${topic}&token=${apiKey}`;
        }

        // Use CORS Proxy - trying 'get' instead of 'raw' for better CORS handling
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

        try {
            const response = await fetch(proxyUrl);
            const wrapperData = await response.json();

            // AllOrigins /get returns data in 'contents' property as a string
            if (!wrapperData.contents) throw new Error('Falha no proxy.');
            const data = JSON.parse(wrapperData.contents);

            if (data.articles) {
                if (data.articles.length === 0) {
                    document.getElementById('news-content').innerHTML = '<div style="opacity:0.6; text-align:center; padding:40px">Nenhuma notícia encontrada nesta categoria.</div>';
                    return;
                }

                const html = data.articles.map(news => `
                    <div class="news-card" onclick="window.open('${news.url}', '_blank')">
                        <div class="news-img" style="background-image: url('${news.image || 'assets/news-placeholder.jpg'}')">
                            <span class="news-badge">${news.source.name}</span>
                        </div>
                        <div class="news-content">
                            <h3 class="news-title">${news.title}</h3>
                            <p style="font-size:0.85rem; opacity:0.8; margin-bottom:12px">${news.description?.substring(0, 100)}...</p>
                            <div class="news-meta">
                                <span>${new Date(news.publishedAt).toLocaleDateString()}</span>
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </div>
                        </div>
                    </div>
                `).join('');
                document.getElementById('news-content').innerHTML = html;
            } else {
                throw new Error('Falha na autenticação ou limites excedidos.');
            }
        } catch (error) {
            document.getElementById('news-content').innerHTML = `<p class="error-msg">Erro: ${error.message}</p>`;
        }
    }

    // ==========================================
    // BRASIL API LOGIC (UPGRADED)
    // ==========================================
    switchTab(tab) {
        document.querySelectorAll('.brasil-tab').forEach(t => t.classList.remove('active'));
        // Find button that calls this tab (safe check)
        const btn = Array.from(document.querySelectorAll('.brasil-tab')).find(b => b.textContent.toLowerCase().includes(tab === 'banks' ? 'bancos' : tab));
        if (btn) btn.classList.add('active');

        const content = document.getElementById('brasil-content');
        content.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Preparando visão...</div>';

        if (tab === 'cep') {
            content.innerHTML = `
                <div class="search-wrap">
                    <input type="text" id="cep-input" class="modern-input" placeholder="00000-000" maxlength="9" onkeypress="if(event.key==='Enter') nexusAPITools.searchCEP()">
                    <button class="modern-btn" onclick="nexusAPITools.searchCEP()">Consultar CEP</button>
                </div>
                <div id="brasil-result" style="margin-top:24px"></div>`;
        } else if (tab === 'feriados') {
            this.fetchFeriados();
        } else if (tab === 'cnpj') {
            content.innerHTML = `
                <div class="search-wrap">
                    <input type="text" id="cnpj-input" class="modern-input" placeholder="00.000.000/0001-00" maxlength="18" onkeypress="if(event.key==='Enter') nexusAPITools.searchCNPJ()">
                    <button class="modern-btn" onclick="nexusAPITools.searchCNPJ()">Consultar CNPJ</button>
                </div>
                <div id="brasil-result" style="margin-top:24px"></div>`;
        } else if (tab === 'banks') {
            this.fetchBanks();
        }
    }

    async searchCEP() {
        let cep = document.getElementById('cep-input').value.replace(/\D/g, ''); // Remove formatting
        const resEl = document.getElementById('brasil-result');

        if (cep.length !== 8) {
            resEl.innerHTML = '<div class="error-msg">CEP inválido. Digite 8 dígitos.</div>';
            return;
        }

        resEl.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Buscando CEP...</div>';

        try {
            const res = await fetch(`${this.apis.brasil}/cep/v2/${cep}`);
            const data = await res.json();

            if (data.cep) {
                const mapLink = data.location ? `https://www.google.com/maps/search/?api=1&query=${data.location.coordinates.latitude},${data.location.coordinates.longitude}` : `https://www.google.com/maps/search/?api=1&query=${data.street}, ${data.city}`;

                resEl.innerHTML = `
                    <div class="api-card animate-fade-in">
                        <div class="api-header-sm">
                            <i class="fa-solid fa-map-location-dot"></i>
                            <h3>${data.street || 'Rua não informada'}</h3>
                        </div>
                        <div class="api-grid-2">
                             <div class="info-item">
                                <label>Bairro</label>
                                <span>${data.neighborhood || '-'}</span>
                             </div>
                             <div class="info-item">
                                <label>Cidade/UF</label>
                                <span>${data.city}/${data.state}</span>
                             </div>
                             <div class="info-item">
                                <label>CEP</label>
                                <span>${data.cep}</span>
                             </div>
                             <div class="info-item">
                                <label>DDD</label>
                                <span>${data.ddd || '-'}</span>
                             </div>
                        </div>
                        <div style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1)">
                            <a href="${mapLink}" target="_blank" class="tools-btn-secondary" style="width:100%; text-align:center; display:block">
                                <i class="fa-solid fa-location-arrow"></i> Ver no Mapa
                            </a>
                        </div>
                    </div>
                `;
            } else {
                resEl.innerHTML = '<div class="error-msg">CEP não encontrado.</div>';
            }
        } catch (e) { resEl.innerHTML = '<div class="error-msg">Erro ao buscar CEP. Verifique a conexão.</div>'; }
    }

    async searchCNPJ() {
        let cnpj = document.getElementById('cnpj-input').value.replace(/[^\d]+/g, ''); // CLEAN INPUT
        const resEl = document.getElementById('brasil-result');

        if (cnpj.length !== 14) {
            resEl.innerHTML = '<div class="error-msg">CNPJ inválido. Deve conter 14 dígitos numéricos.</div>';
            return;
        }

        resEl.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Consultando Receita Federal...</div>';

        try {
            const res = await fetch(`${this.apis.brasil}/cnpj/v1/${cnpj}`);
            if (res.status === 404) throw new Error('CNPJ não encontrado.');
            if (res.status === 429) throw new Error('Muitas requisições. Tente mais tarde.');

            const data = await res.json();

            // Partners HTML
            let partnersHTML = data.qsa && data.qsa.length ? data.qsa.map(p => `
                 <li style="margin-bottom:4px"><i class="fa-solid fa-user-tie"></i> ${p.nome_socio || p.nome} (${p.qualificacao_socio || 'Sócio'})</li>
             `).join('') : '<li>Sem sócios info.</li>';

            // CNAEs HTML
            let cnaesHTML = data.cnaes_secundarios && data.cnaes_secundarios.length ?
                `<p style="font-size:0.85rem; margin-top:8px"><strong>+${data.cnaes_secundarios.length} Atividades Secundárias</strong></p>` : '';

            // Badge Logic
            const statusColor = data.descricao_situacao_cadastral === 'ATIVA' ? '#10b981' : '#ef4444';

            resEl.innerHTML = `
                 <div class="api-card animate-fade-in">
                     <div class="api-header-sm">
                         <div style="flex:1">
                            <div style="font-size:0.8rem; color:var(--text-secondary)">${data.cnpj}</div>
                            <h3>${data.razao_social}</h3>
                            <div style="color:var(--primary-400)">${data.nome_fantasia || ''}</div>
                         </div>
                         <div style="background:${statusColor}; color:white; padding:4px 12px; border-radius:12px; font-weight:bold; font-size:0.8rem">
                            ${data.descricao_situacao_cadastral}
                         </div>
                     </div>

                     <div class="api-grid-2" style="margin-top:20px; gap:20px">
                         <div class="info-block">
                             <h4><i class="fa-solid fa-building"></i> Dados Cadastrais</h4>
                             <p><strong>Abertura:</strong> ${data.data_inicio_atividade}</p>
                             <p><strong>Natureza:</strong> ${data.natureza_juridica}</p>
                             <p><strong>Capital Social:</strong> R$ ${(data.capital_social || 0).toLocaleString()}</p>
                             <p><strong>Porte:</strong> ${data.porte}</p>
                         </div>
                         <div class="info-block">
                             <h4><i class="fa-solid fa-map-pin"></i> Localização</h4>
                             <p>${data.logradouro}, ${data.numero} ${data.complemento || ''}</p>
                             <p>${data.bairro}</p>
                             <p>${data.municipio} - ${data.uf}</p>
                             <p>CEP: ${data.cep}</p>
                         </div>
                     </div>

                     <div class="info-block" style="margin-top:20px">
                         <h4><i class="fa-solid fa-briefcase"></i> Atividade Principal (CNAE)</h4>
                         <p>${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}</p>
                         ${cnaesHTML}
                     </div>

                     <div class="info-block" style="margin-top:20px; background:rgba(0,0,0,0.1); padding:12px; border-radius:8px">
                         <h4><i class="fa-solid fa-users"></i> Sócios e Administradores (QSA)</h4>
                         <ul style="list-style:none; padding:0; margin-top:8px">${partnersHTML}</ul>
                     </div>
                 </div>
             `;
        } catch (e) { resEl.innerHTML = `<div class="error-msg">${e.message || 'Erro na consulta.'}</div>`; }
    }

    async fetchBanks() {
        const content = document.getElementById('brasil-content');

        // Cache Check
        if (!this.state.banksCache) {
            content.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando lista de bancos...</div>';
            try {
                const res = await fetch(`${this.apis.brasil}/banks/v1`);
                this.state.banksCache = await res.json();
            } catch (e) {
                content.innerHTML = '<div class="error-msg">Erro ao carregar bancos.</div>';
                return;
            }
        }

        this.renderBanksList(this.state.banksCache);
    }

    renderBanksList(banks) {
        const content = document.getElementById('brasil-content');
        content.innerHTML = `
            <div class="search-wrap">
                <input type="text" id="bank-search" class="modern-input" placeholder="Buscar banco por nome ou código..." onkeyup="nexusAPITools.filterBanks()">
            </div>
            <div id="banks-list" class="banks-grid">
                ${banks.map(b => this.createBankCard(b)).join('')}
            </div>
        `;
    }

    createBankCard(bank) {
        return `
            <div class="bank-card" data-name="${(bank.name || '').toLowerCase()}" data-code="${bank.code}">
                <div class="bank-code">${bank.code || 'N/A'}</div>
                <div class="bank-name">${bank.name || bank.fullName}</div>
                <div class="bank-ispb">ISPB: ${bank.ispb}</div>
            </div>
        `;
    }

    filterBanks() {
        const term = document.getElementById('bank-search').value.toLowerCase();
        document.querySelectorAll('.bank-card').forEach(card => {
            const name = card.dataset.name;
            const code = card.dataset.code;
            if (name.includes(term) || (code && code.toString().includes(term))) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    async fetchFeriados() {
        const content = document.getElementById('brasil-content');
        const year = new Date().getFullYear();
        content.innerHTML = '<div class="loading-spinner">Buscando feriados...</div>';

        try {
            const res = await fetch(`${this.apis.brasil}/feriados/v1/${year}`);
            const data = await res.json();

            const html = data.map(f => `
                <div class="feriado-item">
                    <div class="feriado-date">${f.date.split('-').reverse().join('/')}</div>
                    <div class="feriado-name">${f.name}</div>
                    <div class="feriado-type">${f.type}</div>
                </div>
            `).join('');

            content.innerHTML = `
                <div class="api-card">
                    <h3 style="margin-bottom:16px;">Feriados Nacionais ${year}</h3>
                    ${html}
                </div>
            `;
        } catch (e) { content.innerHTML = '<div class="error-msg">Erro ao buscar feriados.</div>'; }
    }

    // ==========================================
    // DICTIONARY LOGIC
    // ==========================================

    async searchDict() {
        // Reuse existing logic from previous version or minimal update
        // (Kept consistent with previous implementation for brevity unless requested change)
        const word = document.getElementById('dict-input').value.trim();
        if (!word) return;
        const resultEl = document.getElementById('dict-result');
        resultEl.innerHTML = '<div class="loading-spinner">Consultando...</div>';

        // ... (reuse existing dict logic) ...
        // Re-implementing briefly for completeness in overwrite:
        try {
            const response = await fetch(`${this.apis.dict}/${word}`);
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                const entry = data[0];
                const meanings = entry.meanings ? entry.meanings.map(m => `<li>${m}</li>`).join('') : 'Sem definição';
                resultEl.innerHTML = `
                    <div class="word-title">${entry.word}</div>
                    <div class="meaning-group"><ul>${meanings}</ul></div>
                    ${entry.etymology ? `<p><em>${entry.etymology}</em></p>` : ''}
                `;
            } else { resultEl.innerHTML = 'Não encontrado.'; }
        } catch (e) { resultEl.innerHTML = 'Erro na busca.'; }
    }

    // ==========================================
    // UTILS
    // ==========================================
    configureKeys(type) {
        const val = prompt(`Insira sua API Key para GMews:`);
        if (val) {
            this.state.newsKey = val;
            localStorage.setItem('nep_news_key', val);
            alert('Chave salva!');
        }
    }
}

// Global exposure
window.nexusAPITools = new NexusAPITools();
