# Trading Calculator - Deploy su Vercel

## 📦 CONTENUTO DEL PROGETTO

Questo progetto Next.js è pronto per essere deployato su Vercel GRATUITAMENTE!

```
trading-calculator-deploy/
├── package.json              # Dipendenze del progetto
├── next.config.js            # Configurazione Next.js
├── pages/
│   ├── _app.js              # App wrapper
│   └── index.js             # Homepage (importa TradingCalculator)
├── components/
│   └── TradingCalculator.jsx # Il tuo calcolatore completo
└── README.md                # Questo file
```

---

## 🚀 DEPLOY SU VERCEL IN 3 PASSI

### METODO 1: Deploy con GitHub (CONSIGLIATO - più facile!)

#### PASSO 1: Carica su GitHub

1. Vai su https://github.com
2. Clicca su "New repository" (il bottone verde "New")
3. Nome repository: `trading-calculator`
4. Lascia tutto come default
5. Clicca "Create repository"

6. **Scarica questa cartella sul tuo computer**
7. Apri il terminale nella cartella e esegui:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/trading-calculator.git
git push -u origin main
```

(Sostituisci `TUO-USERNAME` con il tuo username GitHub!)

#### PASSO 2: Deploy su Vercel

1. Vai su https://vercel.com
2. Clicca "Sign Up" e scegli **"Continue with GitHub"**
3. Autorizza Vercel ad accedere a GitHub
4. Clicca "Import Project"
5. Seleziona il repository `trading-calculator`
6. Clicca "Deploy" (NON cambiare nessuna impostazione!)

#### PASSO 3: Aspetta 1-2 minuti

Vercel farà automaticamente:
- ✅ Install delle dipendenze
- ✅ Build del progetto
- ✅ Deploy online
- ✅ Ti darà un link tipo: `https://trading-calculator-xxx.vercel.app`

**FATTO! Il sito è online e GRATIS per sempre!** 🎉

---

### METODO 2: Deploy diretto (senza GitHub)

#### PASSO 1: Installa Vercel CLI

```bash
npm install -g vercel
```

#### PASSO 2: Login a Vercel

```bash
vercel login
```

Segui le istruzioni per creare un account gratuito.

#### PASSO 3: Deploy

Apri il terminale in questa cartella ed esegui:

```bash
vercel --prod
```

Rispondi alle domande:
- Set up and deploy? → **Y**
- Which scope? → Scegli il tuo account
- Link to existing project? → **N**
- What's your project name? → **trading-calculator** (o quello che vuoi)
- In which directory is your code? → **./** (premi Enter)
- Want to override the settings? → **N**

Aspetta 1-2 minuti e riceverai il link!

---

## 🔄 AGGIORNARE IL SITO

### Con GitHub (automatico):

Quando modifichi il file `TradingCalculator.jsx`:

```bash
git add .
git commit -m "Aggiornato calcolatore"
git push
```

Vercel rideployerà automaticamente in 1-2 minuti!

### Con Vercel CLI:

```bash
vercel --prod
```

---

## 💰 COSTI

**Vercel è COMPLETAMENTE GRATUITO per uso personale!**

Piano Hobby (FREE) include:
- ✅ Deploy illimitati
- ✅ Banda illimitata
- ✅ SSL/HTTPS automatico
- ✅ Dominio personalizzato gratis (tipo `trading-calculator.vercel.app`)
- ✅ Nessuna carta di credito richiesta

---

## 🆘 AIUTO

### Il deploy fallisce?

1. Controlla che la cartella contenga tutti i file
2. Verifica che `package.json` sia presente
3. Assicurati di essere nella directory giusta

### Il sito mostra errori?

1. Controlla i logs su https://vercel.com/dashboard
2. Vai al progetto → Deployments → Clicca sul deployment → Build Logs

### Domande?

Contattami e ti aiuto! 😊

---

## 📝 NOTE TECNICHE

- **Framework:** Next.js 14
- **React:** 18.2
- **Hosting:** Vercel (gratuito)
- **File principale:** `components/TradingCalculator.jsx`

---

## ✅ CHECKLIST PRE-DEPLOY

- [ ] Ho scaricato/estratto la cartella `trading-calculator-deploy`
- [ ] Ho aperto il terminale nella cartella
- [ ] Ho un account GitHub (se uso Metodo 1)
- [ ] Sono pronto a deployare!

---

**Buon deploy! 🚀**
