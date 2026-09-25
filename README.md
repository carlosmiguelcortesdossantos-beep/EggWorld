# 🥚 EggWorld

Jogo idle/clicker de granja espacial, inspirado em Egg Inc, com raças de galinha, 5 mundos para colonizar e missões de exploração. Feito para rodar no celular (app web instalável, sem loja).

## Como jogar no celular

1. Abra o link do jogo no navegador do celular (Chrome no Android, Safari no iPhone).
2. Instale como app:
   - **Android (Chrome):** menu ⋮ → **Instalar app** ou **Adicionar à tela inicial**.
   - **iPhone (Safari):** botão Compartilhar → **Adicionar à Tela de Início**.
3. Pronto. O ícone abre em tela cheia e funciona offline.

O progresso fica salvo no próprio aparelho. Para trocar de aparelho, use **Base → Exportar save** e depois **Importar save** no outro.

## O que já existe

- **Mundo 1 com 5 ovos**: Caipira, Codorna, Azul, Mel e Jade, cada fazenda mais cara e mais lucrativa. Todas produzem ao mesmo tempo.
- **Melhorias por fazenda**: preço do ovo, postura, ampliar galinheiros, novos galinheiros, chocadeira, incubadora automática, caçamba, velocidade e novos veículos.
- **Raças de galinha**:
  - Reprodutora: gera galinhas sozinha, inclusive offline.
  - Dourada: ovo 3x mais caro.
  - Pluma: ovo superleve, ocupa 35% do espaço nos veículos.
  - Turbo, Cósmica e Fênix: descobertas com DNA das explorações.
- **Nave de colonização**: cada fazenda desvia uma porcentagem dos ovos para a nave. Com as 5 metas cheias, você coloniza o próximo mundo e ganha renda x2 para sempre.
- **5 mundos**: Vale Verde, Deserto Rubro, Oceano Profundo, Gelo Eterno e Nebulosa Cósmica, cada um com 5 ovos próprios.
- **Exploração**: naves vão para 5 destinos e trazem metal, cristal, fibra, núcleos, ouro e DNA.
- **Oficina** (materiais): veículos, galinheiros, silos e novas naves.
- **Laboratório** (ouro): bônus permanentes.
- **Silos**: definem quanto tempo a granja produz com o app fechado.
- **Presente voador** 🎁 aparece de vez em quando com um bônus.

## Rodar no computador

Não precisa instalar nada. Basta servir a pasta:

```bash
npx http-server -p 8080 -c-1 .
# abra http://localhost:8080
```

## Publicar para os amigos (GitHub Pages)

1. No GitHub: **Settings → Pages → Source: GitHub Actions** (só uma vez).
2. Cada push dispara o workflow `.github/workflows/pages.yml`, que publica o jogo.
3. O link fica em `https://<seu-usuario>.github.io/<repositorio>/`.

## Estrutura

| Arquivo | O que tem |
| --- | --- |
| `js/data.js` | Todo o balanceamento: mundos, ovos, raças, melhorias, missões |
| `js/engine.js` | Regras do jogo, sem interface (dá para testar no Node) |
| `js/ui.js` | Telas e interações |
| `js/main.js` | Loop, progresso offline, salvamento |
| `tools/sim.mjs` | Simulador de balanceamento |
| `tools/smoke.mjs` | Teste de fumaça com navegador (Playwright) |

## Ajustar o balanceamento

Mude os números em `js/data.js` e rode o simulador, que imprime quando um jogador "guloso" compra cada fazenda e coloniza cada mundo:

```bash
node tools/sim.mjs 48 0.5   # 48 horas de jogo, 0,5 toque por segundo
```
