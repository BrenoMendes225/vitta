# Vitta

App pessoal (PWA) para acompanhar **peso, medidas, alimentação, aplicações e treino** — feito para mostrar tendência, não para cobrar perfeição.

- 100% estático: HTML + CSS + JavaScript puro, sem build e sem servidor.
- Dados e fotos ficam **só no aparelho** (IndexedDB do Safari).
- Instalável na Tela de Início do iPhone, funcionando offline.
- Análise de refeições por foto/texto com o **Gemini**, usando a sua chave (chamada direta do navegador para o Google).

---

## O que já está pronto (v0.1)

**Hoje**
- Peso atual, variação na média móvel de 7 dias e mini-gráfico.
- Água do dia com atalhos +250 / +500 ml.
- Proteína do dia com “faltam X g”.
- Próxima aplicação com dose e local do rodízio.
- Atalhos rápidos para pesar, registrar refeição, água e sintomas.

**Peso**
- Gráfico de linha com média móvel de 7 dias, meta e filtros 30d / 90d / tudo.
- Total perdido, distância da meta, IMC e progresso.
- Histórico editável, foto opcional por registro.
- Galeria de fotos de progresso com **comparador antes/depois** (slider).

**Diário**
- Navegação por dia, totais de calorias, proteína, carboidrato e gordura.
- Refeição por texto ou foto, com **análise do Gemini** (itens, macros, comentário e confiança).
- Edição e exclusão de refeições.

**Aplicações**
- Próxima dose calculada pelo intervalo configurado.
- **Rodízio automático de local** (menos usado na sequência).
- Histórico com dose, local e observação.

**Corpo**
- Medidas (cintura, quadril, braço, coxa, peito) com variação.
- Sintomas de 0 a 5 (náusea, intestino, cansaço, apetite) e histórico.
- Treino com tipo, duração, sequência de dias e minutos na semana.

**Outros**
- Relatório do período para levar à consulta (imprimir → salvar em PDF).
- Backup/restauração em JSON.
- Tema claro e escuro automáticos.

---

## Rodar no computador

```bash
cd /home/brenocesar/Documentos/app
python3 -m http.server 8080 --bind 0.0.0.0
```

Abra `http://localhost:8080`.

## Usar no iPhone

### Opção A — mesma rede Wi-Fi (rápido, sem publicar)

1. No computador, rode o servidor acima.
2. Descubra o IP local: `hostname -I` (ex.: `192.168.1.221`).
3. No Safari do iPhone, abra `http://192.168.1.221:8080`.
4. Compartilhar → **Adicionar à Tela de Início**.

Funciona, mas sem service worker (offline) porque não é HTTPS, e o endereço depende do IP do computador.

### Opção B — túnel HTTPS temporário (instala de verdade, hoje)

```bash
cloudflared tunnel --url http://localhost:8080
```

O comando devolve uma URL `https://algo.trycloudflare.com`. Abra no Safari e instale pela Tela de Início.
O túnel só existe enquanto o comando estiver rodando — mas, depois de instalado, o app continua abrindo offline pelo cache.

> Atenção: os dados ficam vinculados ao endereço (origem). Se trocar de URL, o app começa vazio.

### Opção C — hospedagem estática gratuita (recomendado para uso diário)

A pasta inteira é estática. Suba em Netlify, Cloudflare Pages, Vercel ou GitHub Pages e use a URL fixa no iPhone.
Não há backend, login nem dados saindo do aparelho — o site é só o “instalador” do app.

---

## IA (Gemini)

1. Crie uma chave em <https://aistudio.google.com/apikey>.
2. No app: **Ajustes → Inteligência artificial**, cole a chave e toque em **Testar conexão**.
3. No diário, escreva o que comeu e/ou tire uma foto e toque em **Analisar com IA**.

- A chave fica no IndexedDB do aparelho e vai direto para `generativelanguage.googleapis.com`. Ela não passa por nenhum servidor nosso.
- Fotos são comprimidas para ~1200 px antes de enviar, para gastar menos.
- O modelo padrão é `gemini-2.5-flash`; dá para trocar nos ajustes.
- As estimativas são aproximadas e o app avisa isso nas telas.

---

## Dados e backup

- Tudo em IndexedDB: `settings` (em `kv`), `weights`, `measurements`, `meals`, `injections`, `symptoms`, `workouts`, `photos`.
- **Ajustes → Seus dados → Exportar backup (.json)**. Fotos não entram no JSON (são binárias).
- Apagar dados do Safari apaga o app. Faça backup de vez em quando.
- O backup não é criptografado — guarde com cuidado.

---

## Estrutura

```
index.html               app shell
manifest.webmanifest     metadados da PWA
sw.js                    cache offline (mude VERSION ao publicar)
css/styles.css           design system (claro/escuro)
js/
  app.js                 bootstrap + tab bar
  router.js              rotas por hash
  store.js               configurações + eventos
  db.js                  IndexedDB
  ui.js                  sheets, toasts, campos, formatação
  icons.js               ícones SVG
  charts.js              gráfico de linha, sparkline, comparador
  stats.js               médias, totais, sequências
  gemini.js              análise de refeições
  image.js               compressão/miniaturas no aparelho
  forms.js               formulários reutilizáveis
  schedule.js            próxima aplicação + rodízio
  water.js               água por dia
  screens/               uma tela por arquivo
```

Para editar: é só salvar o arquivo e recarregar. Se o service worker estiver ativo, suba `VERSION` em `sw.js` e recarregue duas vezes.

---

## Limitações conhecidas

- **Notificações/lembretes** não funcionam em PWA no iPhone sem push via servidor. A próxima dose aparece no app, mas não toca o celular.
- Fotos muito grandes ou em HEIC podem falhar na compressão em navegadores antigos.
- O relatório usa a impressão do Safari → “Salvar em PDF”.
- Sem login: quem tiver o aparelho desbloqueado tem acesso aos dados.

---

## Próximos passos sugeridos

1. **Resumo semanal com IA** (“você bateu a proteína em 5 de 7 dias…”), salvo por semana.
2. **Conquistas e marcos** (–5 kg, 30 dias de registro, 10 treinos).
3. **Favoritos de refeições** para registrar com um toque.
4. **Modo “dia ruim”**: resposta sem julgamento e próximo passo.
5. **Séries e cargas** no treino.
6. **Scanner de código de barras** (Open Food Facts).
7. Sono e passos (manual; integração com Saúde exige app nativo).

---

Feito para uso pessoal. Não substitui médico ou nutricionista.
