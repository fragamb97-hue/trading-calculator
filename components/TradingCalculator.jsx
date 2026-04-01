import React, { useState, useEffect } from 'react';

const DEFAULT_CREDENTIALS = {
  'FPia': '500',
  'AZuc': '1000',
  'GCos': '1000',
  'GAlberati': '500',
  'Nick': '2500',
  'Rini': '2500',
  '3': '2500',
  '1': '1'
};

const USER_LEVEL_PERMISSIONS = {
  'FPia': [2, 3],     // Livelli 2 e 3
  'AZuc': [2],        // Solo livello 2
  'GCos': [2],        // Solo livello 2
  'GAlberati': [1],   // Solo livello 1
  'Nick': [3, 4],     // Livelli 3 e 4
  'Rini': [3],        // Solo livello 3
  '3': [3, 4],        // Livelli 3 e 4
  '1': [1, 2, 3, 4, 5] // Tutti i livelli (admin)
};

const PROP_WEIGHTS = {
  'the5ers': 1.0,
  'masterfunders': 1.0,
  'fundingtraders': 1.0,
  'fundednext': 1.0,
  'onefunded': 1.0,
  'fundingpips': 1.0,
  'fintokei': 1.0,
  'dragon': 1.0
};

const CAPITAL_TIERS = {
  'default': [5000, 10000, 25000, 50000, 100000],
  'dragon': [5000, 10000, 30000, 60000, 120000]
};

// Helper function to get capital tiers based on sheet/provider
const getCapitalTiers = (sheet) => {
  const sheetKey = sheet === 'Audacity Capital' ? 'dragon' : 'default';
  return CAPITAL_TIERS[sheetKey] || CAPITAL_TIERS['default'];
};


const SOGLIA_MIN = {
  'fundingtraders': [4502, 9004, 22510, 45020, 90040],
  'the5ers': [4502, 9004, 18008, 54024, 90040],
  'masterfunders': [4505, 9010, 22525, 45050, 90100],
  'fundednext': [4602, 9204, 23010, 46020, 92040],
  'onefunded': [4602, 9204, 23010, 46020, 92040],
  'fundingpips': [4502, 9004, 22508, 45020, 90040],
  'fintokei': [4502, 9004, 18006, 45020, 90040],
  'dragon': {
    fase1: [4252, 8504, 25510, 51020, 102040],
    fase2: [4502, 9004, 27010, 54020, 108040]
  }
};

const PERDITA_MAX = {
  'fundingtraders': [80, 160, 400, 800, 1600],
  'the5ers': [200, 400, 800, 2400, 4000],
  'masterfunders': [130, 260, 650, 1300, 2600],
  'fundednext': [160, 320, 800, 1600, 3200],
  'onefunded': [160, 320, 800, 1600, 3200],
  'fundingpips': [130, 260, 650, 1300, 2600],
  'fintokei': [130, 260, 520, 1300, 2600],
  'dragon': [250, 500, 1250, 2500, 5000]
};

const SHEET_CONSTANTS = {
  'fundednext': 0.97,
  'onefunded': 0.97,
  'fundingpips': 0.96,
  'fundingtraders': 0.96,
  'masterfunders': 0.96,
  'the5ers': 0.96,
  'fintokei': 0.96,
  'dragon': 1.0
};

const SPREAD_CONSTANTS = {
  broker: {
    oro: 14,
    eurusd: 7
  },
  fundednext: {
    oro: 56,
    eurusd: 3
  },
  onefunded: {
    oro: 32,
    eurusd: 5
  },
  masterfunders: {
    oro: 18,
    eurusd: 5
  },
  fundingtraders: {
    oro: 32,
    eurusd: 4
  },
  fundingpips: {
    oro: 60,
    eurusd: 1
  },
  the5ers: {
    oro: 60,
    eurusd: 1
  },
  fintokei: {
    oro: 110,
    eurusd: 3
  },
  dragon: {
    oro: 22
  }
};

// Funzione helper per ottenere l8_base dinamici per FundingTraders in base alla percentuale
const getFundingTradersL8Base = (percentage, fase) => {
  const l8_base_config = {
    '20': {
      fase1: [0, 0, 0, 0.16, 0.17],
      fase2: [0, 0, 0, 0.3, 0.31]
    },
    '30': {
      fase1: [0, 0, 0.15, 0.16, 0.18],
      fase2: [0, 0, 0.31, 0.31, 0.3]
    },
    '40': {
      fase1: [0, 0, 0.16, 0.17, 0.18],
      fase2: [0, 0, 0.3, 0.31, 0.31]
    },
    '50': {
      fase1: [0, 0, 0.17, 0.18, 0.19],
      fase2: [0, 0, 0.3, 0.3, 0.3]
    }
  };
  
  return l8_base_config[percentage]?.[`fase${fase}`] || l8_base_config['50'][`fase${fase}`];
};

// Funzione helper per ottenere il prezzo FundingTraders in base alla percentuale e livello
const getFundingTradersPrice = (percentage, livelloUtente) => {
  const prices = {
    '20': [null, null, null, 319, 479],
    '30': [null, null, 174, 279, 419],
    '40': [null, null, 149, 239, 359],
    '50': [null, null, 125, 200, 300]
  };
  
  return prices[percentage]?.[livelloUtente - 1] ?? null;
};

const TradingCalculator = () => {
  // Stati principali
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginError, setShowLoginError] = useState(false);
  const [currentSheet, setCurrentSheet] = useState('FundedNext');
  const [livelloUtente, setLivelloUtente] = useState(1);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCalcolatorePopup, setShowCalcolatorePopup] = useState(false);
  const [propCalcolatore, setPropCalcolatore] = useState('fundednext');
  const [capitaleCalc, setCapitaleCalc] = useState('');
  const [prezzoEurusdCalc, setPrezzoEurusdCalc] = useState('1.10000');
  const [perditaDesiderata, setPerditaDesiderata] = useState('');
  const [profittoDesiderato, setProfittoDesiderato] = useState('');
  const [prezzoIngressoPropCalc, setPrezzoIngressoPropCalc] = useState('');
  const [direzioneCalc, setDirezioneCalc] = useState('BUY');
  
  // Risultati calcolatore (fissi a 0 per ora)
  const [lottiPropCalc, setLottiPropCalc] = useState(0);
  const [lottiBrokerCalc, setLottiBrokerCalc] = useState(0);
  const [takeProfitPropCalc, setTakeProfitPropCalc] = useState(0);
  const [takeProfitBrokerCalc, setTakeProfitBrokerCalc] = useState(0);
  const [stopLossPropCalc, setStopLossPropCalc] = useState(0);
  const [stopLossBrokerCalc, setStopLossBrokerCalc] = useState(0);
  
  // Parametri trading
  const [capitaleFungina, setCapitaleFungina] = useState(5000);
  const [fase, setFase] = useState(1);
  const [operazione, setOperazione] = useState(1);
  const [capitaleSuProp, setCapitaleSuProp] = useState(5000);
  const [profittoOggi, setProfittoOggi] = useState(0);
  const [prezzoApprox, setPrezzoApprox] = useState(5000);
  const [prezzoIngresso, setPrezzoIngresso] = useState('');
  const [tipoOperazione, setTipoOperazione] = useState('BUY');
  const [hasTakeProfit, setHasTakeProfit] = useState(false);
  const [fundingTradersPair, setFundingTradersPair] = useState('XAUUSD'); // Nuovo stato per la coppia di FundingTraders
  const [fundingTradersPercentage, setFundingTradersPercentage] = useState('50'); // Stato per la percentuale di FundingTraders
  
  // Stati per Fase Real
  const [prop1, setProp1] = useState('');
  const [prop2, setProp2] = useState('');
  const [capitale1, setCapitale1] = useState('');
  const [capitale2, setCapitale2] = useState('');
  const [prezzoIngressoReal, setPrezzoIngressoReal] = useState('');
  const [direzioneReal, setDirezioneReal] = useState('BUY');
  const [stopLossProp1Dollari, setStopLossProp1Dollari] = useState(0);
  const [stopLossProp2Dollari, setStopLossProp2Dollari] = useState(0);
  const [takeProfitProp1Dollari, setTakeProfitProp1Dollari] = useState(0);
  const [takeProfitProp2Dollari, setTakeProfitProp2Dollari] = useState(0);
  const [lottiProp1Dollari, setLottiProp1Dollari] = useState(0);
  const [lottiProp2Dollari, setLottiProp2Dollari] = useState(0);
  const [stopLossPrezzoProp1, setStopLossPrezzoProp1] = useState(0);
  const [stopLossPrezzoProp2, setStopLossPrezzoProp2] = useState(0);
  const [takeProfitPrezzoProp1, setTakeProfitPrezzoProp1] = useState(0);
  const [takeProfitPrezzoProp2, setTakeProfitPrezzoProp2] = useState(0);
  
  // Popup stati
  const [showProfittoPopup, setShowProfittoPopup] = useState(false);
  const [tempProfitto, setTempProfitto] = useState(0);
  const [showRisultatiPopup, setShowRisultatiPopup] = useState(false);
  const [risultatoSelezionato, setRisultatoSelezionato] = useState('');
  const [profittoRisultato, setProfittoRisultato] = useState('');
  const [capitalePropRisultato, setCapitalePropRisultato] = useState('');
  const [userPermissions, setUserPermissions] = useState([]);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showFintokeiConfermaPopup, setShowFintokeiConfermaPopup] = useState(false);
  const [fintokeiConfermaMessage, setFintokeiConfermaMessage] = useState('');

  const [risultati, setRisultati] = useState({
    lottiProp: 0, lottiAxi: 0, stopLossPips: 0, stopLossPrezzo: 0,
    stopLossAxiPrezzo: 0, takeProfitPips: 0, takeProfitPrezzo: 0, takeProfitAxiPrezzo: 0,
    l8_base_current: 0.2
  });

  // Previene l'uso di fogli disabilitati
  useEffect(() => {
    // Previene l'uso di MasterFunders (disponibile solo per GCos)
    if (currentSheet === 'MasterFunders' && username !== 'GCos') {
      setCurrentSheet('FundedNext');
    }
    // Previene l'uso di Fintokei per livelli inferiori a 3
    if (currentSheet === 'Fintokei' && livelloUtente < 3) {
      setCurrentSheet('FundedNext');
    }
    // Previene l'uso di FundingTraders per livelli inferiori a 3
    if (currentSheet === 'FundingTraders' && livelloUtente < 3) {
      setCurrentSheet('FundedNext');
    }
    // Rimuove Fintokei dalle selezioni di Fase Real per livelli < 3
    if (livelloUtente < 3) {
      if (prop1 === 'fintokei') setProp1('');
      if (prop2 === 'fintokei') setProp2('');
    }
  }, [livelloUtente, currentSheet, prop1, prop2, username]);

  // Aggiorna prezzo approx per MasterFunders, FundingTraders e Fintokei quando cambia operazione o take profit
  useEffect(() => {
    if (currentSheet === 'MasterFunders') {
      const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
      if (operazione === 2 && capitaleSuProp < capitaleDefault) {
        setPrezzoApprox(1.10000);
      } else {
        setPrezzoApprox(5000);
      }
    } else if (currentSheet === 'FundingTraders') {
      if (operazione === 2) {
        setPrezzoApprox(1.10000);
      } else {
        // In operazione 1, usa sempre XAUUSD
        setPrezzoApprox(5000);
      }
    } else if (currentSheet === 'The5ers') {
      // Per The5ers livelli 4 e 5: usa EURUSD in operazione successiva quando "primo giorno completato?" = Sì
      if (operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5)) {
        setPrezzoApprox(1.10000);
      } else {
        setPrezzoApprox(5000);
      }
    }
    // Reset prezzo ingresso quando cambia operazione per tutti i fogli
    setPrezzoIngresso('');
  }, [operazione, currentSheet, hasTakeProfit, capitaleSuProp, livelloUtente, fundingTradersPair]);

  // Gestisce il reset e l'adattamento della percentuale FundingTraders in base al livello
  useEffect(() => {
    if (currentSheet === 'FundingTraders') {
      // Se livello 3 e percentuale è 20%, resetta a 30%
      if (livelloUtente === 3 && fundingTradersPercentage === '20') {
        setFundingTradersPercentage('30');
      }
    }
  }, [livelloUtente, currentSheet]);

  // Aggiorna capitale di default quando cambia livello
  useEffect(() => {
    const getCapitaleDefault = () => {
      return currentSheet === 'The5ers' 
        ? [5000, 10000, 20000, 60000, 100000][livelloUtente - 1]
        : currentSheet === 'Fintokei'
        ? [5000, 10000, 20000, 50000, 100000][livelloUtente - 1]
        : getCapitalTiers(currentSheet)[livelloUtente - 1];
    };
    
    const capitaleDefault = getCapitaleDefault();
    
    // Aggiorna sempre i capitali quando cambia livello
    setCapitaleFungina(capitaleDefault);
    setCapitaleSuProp(capitaleDefault);
    setCapitale1(capitaleDefault.toString());
    setCapitale2(capitaleDefault.toString());
    
    // Reset altri parametri correlati
    setOperazione(1);
    setProfittoOggi(0);
    setPrezzoIngresso('');
  }, [livelloUtente, currentSheet]);

  // Configurazione centralizzata dei provider
  const PROVIDER_CONFIG = {
    FundingPips: {
      key: 'fundingpips',
      factor: 0.75,
      k8Calc: (prezzo) => prezzo / 30,
      l8_base: {
        fase1: [0.18, 0.19, 0.2, 0.2, 0.21],
        fase2: [0.31, 0.3, 0.3, 0.31, 0.3]
      },
      soglie: [250, 500, 1250, 2500, 5000],
      soglie2: [420, 840, 2100, 4200, 8400],
      adjustments: {
        fase1: { adj1: [0.02, 0.05, 0.14, 0.3, 0.58], adj2: [0.01, 0.03, 0.07, 0.15, 0.32] },
        fase2: { adj1: [0.04, 0.07, 0.23, 0.42, 0.88], adj2: [0.02, 0.04, 0.1, 0.22, 0.45] }
      },
      targets: [4500, 9000, 22500, 45000, 90000],
      soglie180: [250, 500, 1250, 2500, 5000],
      thresholds: [4502, 9004, 22510, 45020, 90040]
    },
    FundingTraders: {
      key: 'fundingtraders',
      factor: 0.29,
      k8Calc: (prezzo) => prezzo / 20,
      l8_base: {
        fase1: [0, 0, 0.1, 0.13, 0.16],
        fase2: [0, 0, 0.2, 0.2, 0.2]
      },
      soglie: [250, 500, 1250, 2500, 5000],
      soglie2: [420, 840, 2100, 4200, 8400],
      adjustments: {
        fase1: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] },
        fase2: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] }
      },
      targets: [4500, 9000, 22500, 45000, 90000],
      soglie180: [250, 500, 1250, 2500, 5000],
      thresholds: [4502, 9004, 22510, 45020, 90040]
    },
    MasterFunders: {
      key: 'masterfunders',
      factor: username === 'GCos' ? 0.36 : 0.46,
      k8Calc: (prezzo, operazione, capitaleSuProp, livelloUtente) => {
        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
        return (operazione === 2 && capitaleSuProp < capitaleDefault) ? prezzo * 10 : prezzo / 24;
      },
      l8_base: {
        fase1: [0.18, 0.2, 0.2, 0.21, 0.22],
        fase2: [0.3, 0.3, 0.3, 0.29, 0.29]
      },
      soglie: [250, 500, 1250, 2500, 5000],
      soglie2: [420, 840, 2100, 4200, 8400],
      adjustments: {
        fase1: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] },
        fase2: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] }
      },
      targets: [4500, 9000, 22500, 45000, 90000],
      soglie180: [250, 500, 1250, 2500, 5000],
      getThreshold: (operazione, livello, capitaleSuProp) => {
        const base = [4502, 9004, 22510, 45020, 90040];
        const operazione2 = [4515, 9030, 22575, 45150, 90300];
        const capitaleDefault = getCapitalTiers(currentSheet)[livello - 1];
        return (operazione === 1 || capitaleSuProp >= capitaleDefault) ? base[livello - 1] : operazione2[livello - 1];
      }
    },
    Fintokei: {
      key: 'fintokei',
      factor: 0.75,
      k8Calc: (prezzo) => prezzo / 30,
      l8_base: {
        fase1: [0, 0, 0.22, 0.17, 0.18],
        fase2: [0, 0, 0.35, 0.28, 0.28]
      },
      soglie: [250, 500, 1000, 2500, 5000],
      soglie2: [420, 840, 1680, 4200, 8400],
      adjustments: {
        fase1: { adj1: [0.02, 0.05, 0.14, 0.3, 0.58], adj2: [0.01, 0.03, 0.07, 0.15, 0.32] },
        fase2: { adj1: [0.04, 0.07, 0.23, 0.42, 0.88], adj2: [0.02, 0.04, 0.1, 0.22, 0.45] }
      },
      targets: [4500, 9000, 18000, 45000, 90000],
      soglie180: [250, 500, 1000, 2500, 5000],
      thresholds: [4502, 9004, 18008, 45020, 90040]
    },
    The5ers: {
      key: 'the5ers',
      factor: 0.8,
      k8Calc: (prezzo, livello, operazione, hasTakeProfit) => {
        // Per livelli 4 e 5: usa EURUSD (prezzo * 8) se operazione = successiva e hasTakeProfit = true
        if ((livello === 4 || livello === 5) && operazione === 2 && hasTakeProfit) {
          return prezzo * 8;
        }
        // Altrimenti: Livelli 1, 2, 3: prezzo/15; Livelli 4, 5: prezzo/10
        return (livello >= 4) ? prezzo / 10 : prezzo / 15;
      },
      l8_base: {
        fase1: [0.18, 0.18, 0.25, 0.2, 0.21],
        fase2: [0.3, 0.3, 0.36, 0.3, 0.3]
      },
      soglie: [250, 500, 1000, 3000, 5000],
      soglie2: [420, 840, 1680, 5040, 8400],
      adjustments: {
        fase1: { adj1: [0.01, 0.02, 0.04, 0, 0], adj2: [0, 0, 0.02, 0, 0] },
        fase2: { adj1: [0.02, 0.04, 0.06, 0, 0], adj2: [0, 0.01, 0.04, 0, 0] }
      },
      targets: [4500, 9000, 18000, 54000, 90000],
      soglie180: [250, 500, 1000, 3000, 5000],
      thresholds: [4502, 9004, 18008, 54024, 90040]
    },
    FundedNext: {
      key: 'fundednext',
      factor: 0.67,
      k8Calc: (prezzo) => prezzo / 10,
      l8_base: {
        fase1: [0.18, 0.19, 0.2, 0.21, 0.22],
        fase2: [0.38, 0.38, 0.37, 0.37, 0.37]
      },
      soglie: [200, 400, 1000, 2000, 4000],
      soglie2: [350, 700, 1750, 3500, 7000],
      adjustments: {
        fase1: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] },
        fase2: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] }
      },
      targets: [4600, 9200, 23000, 46000, 92000],
      soglie180: [200, 400, 1000, 2000, 4000],
      thresholds: [4602, 9204, 23010, 46020, 92040]
    },
    OneFunded: {
      key: 'onefunded',
      factor: {
        fase1: 0.4,
        fase2: 0.3
      },
      k8Calc: (prezzo) => prezzo / 30,
      l8_base: {
        fase1: [0.2, 0.21, 0.27, 0.29, 0.3],
        fase2: [0.35, 0.33, 0.33, 0.32, 0.31]
      },
      soglie: [200, 400, 1000, 2000, 4000],
      soglie2: [350, 700, 1750, 3500, 7000],
      adjustments: {
        fase1: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] },
        fase2: { adj1: [0, 0, 0, 0, 0], adj2: [0, 0, 0, 0, 0] }
      },
      targets: [4600, 9200, 23000, 46000, 92000],
      soglie180: [200, 400, 1000, 2000, 4000],
      thresholds: [4602, 9204, 23010, 46020, 92040]
    },
    // ===== DRAGON CONFIGURATION =====
    // Provider Info:
    // - Challenge Phases: 2 (rimossa fase 3)
    // - Nome Challenge: Audacity Capital
    // - Piattaforma: Platform 5
    // - Dimensione Challenge: $5,000 (Liv1), $10,000 (Liv2), $30,000 (Liv3), $60,000 (Liv4), $120,000 (Liv5)
    // - Prezzo: $49 (Liv1), $55 (Liv2), $89 (Liv3), $159 (Liv4), $299 (Liv5)
    'Audacity Capital': {
      key: 'dragon',
      factor: 0.75,
      k8Calc: (prezzo) => prezzo / 30,
      l8_base: {
        fase1: [0.13, 0.13, 0.12, 0.13, 0.14], // Livelli 1,2,3,4,5
        fase2: [0.3, 0.31, 0.25, 0.26, 0.25]   // Livelli 1,2,3,4,5
      },
      soglie: [250, 500, 1250, 2500, 5000],
      soglie2: [420, 840, 2100, 4200, 8400],
      adjustments: {
        fase1: { adj1: [0.01, 0.03, 0.10, 0.18, 0.35], adj2: [0, 0.02, 0.06, 0.11, 0.2] },
        fase2: { adj1: [0.02, 0.05, 0.13, 0.28, 0.55], adj2: [0.01, 0.03, 0.06, 0.13, 0.28] }
      },
      targets: {
        fase1: [4250, 8500, 25500, 51000, 102000],
        fase2: [4500, 9000, 27000, 54000, 108000]
      },
      soglie180: [250, 500, 1250, 2500, 5000],
      thresholds: {
        fase1: [4252, 8504, 25510, 51020, 102040],
        fase2: [4502, 9004, 27010, 54020, 108040]
      }
    }
  };

  // Calcoli principali ottimizzati
  useEffect(() => {
    // Audacity Capital: usa la stessa formula completa degli altri fogli
    if (currentSheet === 'Audacity Capital') {
      const config = PROVIDER_CONFIG['Audacity Capital'];
      
      // Calcolo k8 per Audacity Capital
      const k8 = config.k8Calc(prezzoApprox);
      
      // Ottieni l8_base per la fase corrente
      const l8_base = config.l8_base[`fase${fase}`] || config.l8_base.fase1;
      const l8_base_current = l8_base[livelloUtente - 1];
      
      // Factor per Dragon
      const factor = config.factor;
      
      // Calcolo l8 e m8
      const l8_value = (capitaleSuProp * factor / k8) * l8_base_current;
      const m8 = Math.floor(l8_value) / 100;
      
      // Calcolo stop loss con formula completa degli altri fogli
      const getStopLoss = () => {
        // Moltiplicatori per Audacity Capital (stessi di FundingPips: standard)
        const multipliers = [1, 2, 5, 10, 20];
        const multiplier = multipliers[livelloUtente - 1];
        
        // Valori base per Audacity Capital (solo fase1 e fase2)
        const values = {
          fase1: 5405,
          fase2: 5255,
          thresholdFase2: 4800
        };
        
        const targetValue = (fase === 1 ? values.fase1 : (fase === 2 ? values.fase2 : values.fase3)) * multiplier;
        const thresholdValue = values.thresholdFase2 * multiplier;
        
        if (fase === 1) {
          if (operazione === 1) {
            // Nuova formula per Audacity Capital fase 1 operazione prima:
            // (baseValue - capitaleSuProp) / 2.5
            // Livello 1: (5500 - cap) / 2.5
            // Livello 2: (11000 - cap) / 2.5
            // Livello 3: (33000 - cap) / 2.5
            // Livello 4: (66000 - cap) / 2.5
            // Livello 5: (132000 - cap) / 2.5
            const baseValues = [5500, 11000, 33000, 66000, 132000];
            const baseValue = baseValues[livelloUtente - 1];
            return (baseValue - capitaleSuProp) / 2.5;
          } else {
            // Nuova formula per Audacity Capital fase 1 operazione successiva:
            // baseValue - capitaleSuProp
            // Livello 1: 5504 - cap
            // Livello 2: 11008 - cap
            // Livello 3: 33024 - cap
            // Livello 4: 66048 - cap
            // Livello 5: 132096 - cap
            const baseValuesSuccessiva = [5504, 11008, 33024, 66048, 132096];
            const baseValue = baseValuesSuccessiva[livelloUtente - 1];
            return profittoOggi === 0 ? 0 : baseValue - capitaleSuProp;
          }
        } else { // fase === 2
          if (operazione === 1) {
            // Nuova formula per Audacity Capital fase 2 operazione prima:
            // (baseValue - capitaleSuProp) / 2
            // Livello 1: (5250 - cap) / 2
            // Livello 2: (10500 - cap) / 2
            // Livello 3: (31500 - cap) / 2
            // Livello 4: (63000 - cap) / 2
            // Livello 5: (126000 - cap) / 2
            const baseValuesFase2 = [5250, 10500, 31500, 63000, 126000];
            const baseValue = baseValuesFase2[livelloUtente - 1];
            return (baseValue - capitaleSuProp) / 2;
          } else {
            // Nuova formula per Audacity Capital fase 2 operazione successiva:
            // baseValue - capitaleSuProp
            // Livello 1: 5254 - cap
            // Livello 2: 10508 - cap
            // Livello 3: 31524 - cap
            // Livello 4: 63048 - cap
            // Livello 5: 126096 - cap
            const baseValuesSuccessivaFase2 = [5254, 10508, 31524, 63048, 126096];
            const baseValue = baseValuesSuccessivaFase2[livelloUtente - 1];
            return profittoOggi === 0 ? 0 : baseValue - capitaleSuProp;
          }
        }
      };
      
      const stopLossPips = getStopLoss();
      
      // Calcolo take profit con formula completa degli altri fogli
      const getTakeProfit = () => {
        // LOGICA SPECIALE PER AUDACITY CAPITAL FASE 1
        if (fase === 1) {
          // Take profit proporzionale per livello: [360, 720, 1800, 3600, 7200]
          const moltiplicatori = [1, 2, 5, 10, 20];
          const moltiplicatore = moltiplicatori[livelloUtente - 1];
          const takeProfitBase = 360 * moltiplicatore;
          
          // Soglie minime per livello: [4250, 8500, 25500, 51000, 102000]
          const currentTargets = config.targets.fase1;
          const sogliaMinima = currentTargets[livelloUtente - 1];
          
          // Thresholds per livello: [4252, 8504, 25510, 51020, 102040]
          const currentThresholds = config.thresholds.fase1;
          const threshold = currentThresholds[livelloUtente - 1];
          
          let takeProfitResult;
          
          // Condizione di sicurezza: non scendere sotto la soglia minima
          if (capitaleSuProp - takeProfitBase < sogliaMinima) {
            takeProfitResult = capitaleSuProp - threshold;
          } else {
            takeProfitResult = takeProfitBase;
          }
          
          // Per operazione successiva: SOMMA profittoOggi al take profit
          if (operazione === 2) {
            takeProfitResult = takeProfitResult + profittoOggi;
          }
          
          return takeProfitResult;
        }
        
        // LOGICA NORMALE PER FASE 2 (come gli altri provider)
        // Calcolo capitale di default e costanti per il livello corrente
        const currentTargets = config.targets.fase2;
        const capitaliDefault = currentTargets; // Targets Audacity Capital fase 2
        const capitaleDefault = capitaliDefault[livelloUtente - 1];
        const sheetConstant = 0.96; // Sheet constant per Audacity Capital
        const sogliaCostante = capitaleDefault * sheetConstant;
        
        // Configurazione parametrizzata per Take Profit Audacity Capital fase 2
        const currentThresholds = config.thresholds.fase2;
        
        const takeProfitConfig = {
          targets: currentTargets, // Fase 2 targets
          soglie180: config.soglie180, // [250, 500, 1250, 2500, 5000]
          thresholds: currentThresholds, // Fase 2 thresholds
          getThreshold: (operazione, livello) => {
            return currentThresholds[livello - 1];
          },
          getValore130: (isSogliaExceeded, operazione, capitaleSuProp, livelloUtente) => {
            // Valori per Audacity Capital (simili a FundingPips)
            const audacityMultipliers = isSogliaExceeded ? 
              [236, 472, 1180, 2360, 4720] : 
              [245, 490, 1225, 2450, 4900];
            return audacityMultipliers[livelloUtente - 1];
          }
        };
        
        const target = takeProfitConfig.targets[livelloUtente - 1];
        const soglia180 = takeProfitConfig.soglie180[livelloUtente - 1];
        const threshold = takeProfitConfig.getThreshold(operazione, livelloUtente, capitaleSuProp);
        const isSogliaExceeded = capitaleSuProp > sogliaCostante;
        let valore130 = takeProfitConfig.getValore130(isSogliaExceeded, operazione, capitaleSuProp, livelloUtente);
        
        // Solo per FundingPips in operazione successiva: riduzione 5%
        if (config.key === 'fundingpips' && operazione === 2) {
          valore130 = Math.round(valore130 * 0.95);
        }
        
        // Logica unificata per fase 2
        if (operazione === 1) {
          if (capitaleSuProp - target < soglia180) {
            return capitaleSuProp - threshold;
          } else {
            return valore130;
          }
        } else {
          // Per operazione successiva: SOMMA profittoOggi al take profit
          if (capitaleSuProp - profittoOggi - target < soglia180) {
            return capitaleSuProp - threshold + profittoOggi;
          } else {
            return valore130 + profittoOggi;
          }
        }
      };
      
      let takeProfitPips = getTakeProfit();
      
      // Calcolo final pips per broker (come negli altri fogli)
      // Audacity Capital non ha logiche speciali di modifica, quindi final = base
      let finalStopLossPips = stopLossPips;
      let finalTakeProfitPips = takeProfitPips;
      
      // Limite MINIMO Take Profit per MasterFunders: non può essere più negativo di -80$ × moltiplicatore (PRIORITARIO, si applica DOPO tutte le altre modifiche)
      // NOTA: a causa di uno swap nell'interfaccia, finalStopLossPips è quello mostrato come "TAKE PROFIT PROP"
      if (config.key === 'masterfunders') {
        const minTakeProfit = [-80, -160, -400, -800, -1600][livelloUtente - 1];
        
        // Se è più negativo del minimo, limita al minimo
        if (finalStopLossPips < minTakeProfit) {
          finalStopLossPips = minTakeProfit;
        }
        if (finalTakeProfitPips < minTakeProfit) {
          finalTakeProfitPips = minTakeProfit;
        }
      }
      
      // Calcolo adjustments
      const adj = config.adjustments[`fase${fase}`] || config.adjustments.fase1;
      const adj1 = adj.adj1[livelloUtente - 1];
      const adj2 = adj.adj2[livelloUtente - 1];
      
      // Calcolo lotti - CALCOLO CLASSICO per Audacity Capital
      // Usa m8 che è già stato calcolato con k8
      const lottiAxi = m8;
      const lottiProp = m8 / l8_base_current;
      
      // Calcolo stop loss prezzo usando final pips E lotti prop
      const moltiplicatore = 100; // XAUUSD
      const stopLossPrezzo = tipoOperazione === 'BUY' ? 
        prezzoIngresso + finalStopLossPips / (lottiProp * moltiplicatore) :
        prezzoIngresso - finalStopLossPips / (lottiProp * moltiplicatore);
      
      // Calcolo take profit prezzo usando final pips E lotti prop
      const takeProfitPrezzo = tipoOperazione === 'BUY' ?
        prezzoIngresso - finalTakeProfitPips / (lottiProp * moltiplicatore) :
        prezzoIngresso + finalTakeProfitPips / (lottiProp * moltiplicatore);
      
      // Calcolo spread offset per Audacity Capital (XAUUSD)
      const spreadOroProp = SPREAD_CONSTANTS.dragon.oro;
      const spreadOroBroker = SPREAD_CONSTANTS.broker.oro;
      const spreadOffset = (spreadOroProp + spreadOroBroker) / 200;
      
      // Stop loss broker - take profit prezzo ± spread offset
      const stopLossAxiPrezzo = tipoOperazione === 'BUY' ?
        takeProfitPrezzo + spreadOffset :
        takeProfitPrezzo - spreadOffset;
      
      // Take profit broker - stop loss prezzo ± spread offset  
      const takeProfitAxiPrezzo = tipoOperazione === 'BUY' ?
        stopLossPrezzo + spreadOffset :
        stopLossPrezzo - spreadOffset;
      
      // Calcolo dollari usando final pips
      const commissioni = 40; // Commissioni standard per Audacity Capital
      
      // Stop Loss Prop dollari = semplicemente i final pips
      const stopLossPropDollari = finalStopLossPips;
      
      // Stop Loss Broker dollari = final pips * l8_base + (lotti broker * commissioni)
      const stopLossBrokerDollari = finalStopLossPips * l8_base_current + (lottiAxi * commissioni);
      
      // Take Profit Prop dollari = semplicemente i final pips
      const takeProfitPropDollari = finalTakeProfitPips;
      
      // Take Profit Broker dollari = final pips * l8_base - (lotti broker * commissioni)
      const takeProfitBrokerDollari = finalTakeProfitPips * l8_base_current - (lottiAxi * commissioni);
      
      // Imposta tutti i valori calcolati inclusi dollari usando final pips
      setRisultati({
        lottiProp: Math.round(lottiProp * 100) / 100,
        lottiAxi: Math.round(lottiAxi * 100) / 100,
        stopLossPips: Math.round(finalStopLossPips),
        stopLossPrezzo: Math.round(stopLossPrezzo * 100) / 100,
        stopLossAxiPrezzo: Math.round(stopLossAxiPrezzo * 100) / 100,
        takeProfitPips: Math.round(finalTakeProfitPips),
        takeProfitPrezzo: Math.round(takeProfitPrezzo * 100) / 100,
        takeProfitAxiPrezzo: Math.round(takeProfitAxiPrezzo * 100) / 100,
        l8_base_current: l8_base_current,
        // Dollari (aggiunti per visualizzazione)
        stopLossPropDollari: Math.round(stopLossPropDollari * 100) / 100,
        stopLossBrokerDollari: Math.round(stopLossBrokerDollari * 100) / 100,
        takeProfitPropDollari: Math.round(takeProfitPropDollari * 100) / 100,
        takeProfitBrokerDollari: Math.round(takeProfitBrokerDollari * 100) / 100
      });
      return;
    }
    
    const config = PROVIDER_CONFIG[currentSheet] || PROVIDER_CONFIG.FundedNext;
    const isFundingPips = currentSheet === 'FundingPips';
    const isFundingTraders = currentSheet === 'FundingTraders';
    const isMasterFunders = currentSheet === 'MasterFunders';
    const isFintokei = currentSheet === 'Fintokei';
    const isThe5ers = currentSheet === 'The5ers';
    const isAudacityCapital = currentSheet === 'Audacity Capital';
    const isOneFunded = currentSheet === 'OneFunded';
    
    // Calcolo k8 usando la configurazione
    let k8;
    if (config.key === 'masterfunders') {
      k8 = config.k8Calc(prezzoApprox, operazione, capitaleSuProp, livelloUtente);
    } else if (config.key === 'fundingtraders') {
      // k8 per FundingTraders
      if (operazione === 2) {
        k8 = prezzoApprox * 20; // Operazione successiva (EURUSD): prezzo × 20
      } else {
        k8 = config.k8Calc(prezzoApprox); // Operazione prima (XAUUSD): usa config (prezzo / 20)
      }
    } else if (config.key === 'fintokei') {
      k8 = config.k8Calc(prezzoApprox);
    } else if (config.key === 'the5ers') {
      k8 = config.k8Calc(prezzoApprox, livelloUtente, operazione, hasTakeProfit);
    } else {
      k8 = config.k8Calc(prezzoApprox);
    }
    
    // Factor - per OneFunded dipende dalla fase
    const factor = isOneFunded 
      ? config.factor[`fase${fase}`] 
      : config.factor;
    
    // Per FundingTraders usa l8_base dinamici in base alla percentuale selezionata
    const l8_base = isFundingTraders 
      ? getFundingTradersL8Base(fundingTradersPercentage, fase)
      : config.l8_base[`fase${fase}`];
    
    // Modifica speciale per MasterFunders: factor = 0.3 se fase=2, operazione=successiva e cap.prop > capitale default × 1.02
    let finalFactor = factor;
    
    // Modifica speciale per The5ers livelli 4 e 5
    if (config.key === 'the5ers' && (livelloUtente === 4 || livelloUtente === 5)) {
      // Quando usa EURUSD (operazione successiva + hasTakeProfit = true): factor = 0.4
      if (operazione === 2 && hasTakeProfit) {
        finalFactor = 0.4;
      } else {
        // Altrimenti: factor = 0.75
        finalFactor = 0.75;
      }
    }
    
    // if (config.key === 'masterfunders' && fase === 2 && operazione === 2) {
    //   const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
    //   if (capitaleSuProp > capitaleDefault * 1.02) {
    //     finalFactor = 0.3;
    //   }
    // }

    const l8 = (capitaleSuProp * finalFactor / k8) * l8_base[livelloUtente - 1];
    const m8 = Math.floor(l8) / 100;
    
    // Calcolo Stop Loss ottimizzato con logica unificata per livelli
    const getStopLoss = () => {
      // Moltiplicatori per livelli: standard [1, 2, 5, 10, 20], The5ers [1, 2, 4, 12, 20], Fintokei [1, 2, 4, 10, 20]
      const standardMultipliers = [1, 2, 5, 10, 20];
      const the5ersMultipliers = [1, 2, 4, 12, 20];
      const fintokeiMultipliers = [1, 2, 4, 10, 20];
      const multipliers = isThe5ers ? the5ersMultipliers : (isFintokei ? fintokeiMultipliers : standardMultipliers);
      const multiplier = multipliers[livelloUtente - 1];
      
      // Valori base per livello 1
      const getBaseValues = () => {
        const standardValues = {
          fundingpips: { fase1: 5405, fase2: 5255, thresholdFase2: 4800 },
          fundingtraders: { fase1: 5505, fase2: 5255, thresholdFase2: 4800 },
          fintokei: { fase1: 5405, fase2: 5305, thresholdFase2: 4800 },
          the5ers: { fase1: 5402, fase2: 5252, thresholdFase2: 4000 }, // Valori specifici per The5ers
          fundednext: { fase1: 5402, fase2: 5202, thresholdFase2: 4900 },
          onefunded: { fase1: 5402, fase2: 5202, thresholdFase2: 4900 }
        };

        // Logica speciale per MasterFunders
        if (isMasterFunders) {
          const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
          if (operazione === 2 && capitaleSuProp < capitaleDefault) {
            return { masterfunders: { fase1: 5440, fase2: 5290, thresholdFase2: 5100 } };
          } else {
            return { masterfunders: { fase1: 5415, fase2: 5265, thresholdFase2: 5100 } };
          }
        }

        return standardValues;
      };

      const baseValues = getBaseValues();
      
      // The5ers ha valori hardcoded diversi per alcuni livelli
      if (isThe5ers) {
        const the5ersValues = {
          1: { fase1: 5402, fase2: 5252, thresholdFase2: 4000 },
          2: { fase1: 10804, fase2: 10504, thresholdFase2: 8000 },
          3: { fase1: 21608, fase2: 21008, thresholdFase2: 16000 },
          4: { fase1: 64824, fase2: 63024, thresholdFase2: 48000 },
          5: { fase1: 108040, fase2: 105040, thresholdFase2: 80000 }
        };
        
        const values = the5ersValues[livelloUtente];
        
        if (fase === 1) {
          if (operazione === 1) {
            return (values.fase1 - capitaleSuProp) / 3;
          } else {
            return profittoOggi === 0 ? 0 : values.fase1 - capitaleSuProp;
          }
        } else {
          if (operazione === 1) {
            if (capitaleSuProp < values.thresholdFase2) {
              return (values.fase2 - capitaleSuProp) / 3;
            } else {
              return (values.fase2 - capitaleSuProp) / 2;
            }
          } else {
            return profittoOggi === 0 ? 0 : values.fase2 - capitaleSuProp;
          }
        }
      }
      
      // Logica speciale per Fintokei in operazione = prima: stop loss fisso proporzionale
      if (isFintokei && operazione === 1) {
        const fintokeiStopLossValues = [100, 200, 400, 1000, 2000]; // Moltiplicatori [1, 2, 4, 10, 20]
        const stopLossFisso = fintokeiStopLossValues[livelloUtente - 1];
        
        // Se "Primo giorno completato?" = SÌ, aggiungi componente variabile
        if (hasTakeProfit) {
          const capPropBase = [5000, 10000, 20000, 50000, 100000][livelloUtente - 1];
          
          if (capPropBase > capitaleSuProp) {
            // stopLoss = fisso + (capPropBase - capPropInserito) / 2
            return stopLossFisso + (capPropBase - capitaleSuProp) / 2;
          } else {
            // Se capPropBase <= capPropInserito, rimane solo il fisso
            return stopLossFisso;
          }
        } else {
          // Se "Primo giorno completato?" = NO, solo fisso
          return stopLossFisso;
        }
      }
      
      // Logica speciale per Fintokei in operazione = successiva con "Primo giorno completato?" = Si
      if (isFintokei && operazione === 2 && hasTakeProfit) {
        const moltiplicatori = [1, 2, 4, 10, 20];
        const moltiplicatore = moltiplicatori[livelloUtente - 1];
        
        const soglia1 = 4950 * moltiplicatore; // [4950, 9900, 19800, 49500, 99000]
        const soglia2 = 4800 * moltiplicatore; // [4800, 9600, 19200, 48000, 96000]
        const valore1 = 5110 * moltiplicatore; // [5110, 10220, 20440, 51100, 102200]
        const valore2 = 5010 * moltiplicatore; // [5010, 10020, 20040, 50100, 100200]
        
        if (capitaleSuProp <= soglia2) {
          // cap <= 4800: stop loss = 5010 - cap
          return valore2 - capitaleSuProp;
        } else if (capitaleSuProp <= soglia1) {
          // cap <= 4950: stop loss = 5110 - cap
          return valore1 - capitaleSuProp;
        }
        // Altrimenti continua con la logica normale (cap > 4950)
      }
      
      // Logica speciale per FundingTraders in operazione = successiva
      if (isFundingTraders && operazione === 2) {
        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
        const sogliaSup = capitaleDefault * 1.02;
        const sogliaInf = capitaleDefault * 0.98;
        
        // CASO 1: capitaleSuProp > sogliaSup → continua con logica normale
        if (capitaleSuProp > sogliaSup) {
          // Continua con la logica normale sotto
        }
        // CASO 2: sogliaInf < capitaleSuProp ≤ sogliaSup → formule fisse
        else if (capitaleSuProp > sogliaInf && capitaleSuProp <= sogliaSup) {
          if (fase === 1) {
            // Fase 1: stopLoss = (capitaleDefault × 1.04) - capitaleSuProp
            return (capitaleDefault * 1.04) - capitaleSuProp;
          } else {
            // Fase 2: stopLoss = capitaleDefault × 0.025
            return capitaleDefault * 0.025;
          }
        }
        // CASO 3: capitaleSuProp ≤ sogliaInf → formule dinamiche
        else {
          if (fase === 1) {
            // Fase 1: stopLoss = (capitaleDefault × 1.04) - capitaleSuProp
            return (capitaleDefault * 1.04) - capitaleSuProp;
          } else {
            // Fase 2: stopLoss = (capitaleDefault × 1.02) - capitaleSuProp
            return (capitaleDefault * 1.02) - capitaleSuProp;
          }
        }
      }
      
      // Logica speciale per FundingTraders in operazione = prima (XAUUSD)
      if (isFundingTraders && operazione === 1) {
        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
        
        if (fase === 1) {
          const soglia = capitaleDefault * 1.04; // Soglie: 5200, 10400, 26000, 52000, 104000
          const target = capitaleDefault * 1.10; // Targets: 5500, 11000, 27500, 55000, 110000
          
          if (capitaleSuProp > soglia) {
            // Stop Loss = target - capitaleSuProp
            return target - capitaleSuProp;
          }
        } else if (fase === 2) {
          const soglia = capitaleDefault * 1.02; // Soglie: 5100, 10200, 25500, 51000, 102000
          const target = capitaleDefault * 1.051; // Targets: 5255, 10510, 26275, 52550, 105100
          
          if (capitaleSuProp > soglia) {
            // Stop Loss = target - capitaleSuProp
            return target - capitaleSuProp;
          }
        }
      }
      
      // Logica speciale per OneFunded in operazione = prima
      if (isOneFunded && operazione === 1) {
        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
        
        if (fase === 1) {
          // FASE 1: Formule proporzionali per tutti i livelli
          // Moltiplicatori: [1, 2, 5, 10, 20]
          const moltiplicatori = [1, 2, 5, 10, 20];
          const moltiplicatore = moltiplicatori[livelloUtente - 1];
          
          // Soglia per take profit: [4660, 9320, 23300, 46600, 93200]
          const sogliaTP = 4660 * moltiplicatore;
          
          // Take profit fisso: [160, 320, 800, 1600, 3200]
          const takeProfitFisso = 160 * moltiplicatore;
          
          // Threshold minimo: [4502, 9004, 22510, 45020, 90040]
          const thresholdMinimo = 4502 * moltiplicatore;
          
          // Valore per stop loss: [5350, 10700, 26750, 53500, 107000]
          const valoreStopLoss = 5350 * moltiplicatore;
          
          // Take Profit Prop: Se cap prop > soglia → fisso, altrimenti → cap prop - threshold
          const takeProfitProp = capitaleSuProp > sogliaTP ? takeProfitFisso : capitaleSuProp - thresholdMinimo;
          
          // Stop Loss Prop: (valore - cap prop) / 3
          const stopLossProp = (valoreStopLoss - capitaleSuProp) / 3;
          
          return stopLossProp;
        } else {
          // Fase 2: Formule proporzionali
          // Moltiplicatori: [1, 2, 5, 10, 20]
          const moltiplicatori = [1, 2, 5, 10, 20];
          const moltiplicatore = moltiplicatori[livelloUtente - 1];
          
          // Valore per stop loss fase 2: [5200, 10400, 26000, 52000, 104000]
          const valoreStopLossFase2 = 5200 * moltiplicatore;
          
          // Stop Loss Prop Fase 2 Operazione Prima: (valore - cap prop) / 2.5
          return (valoreStopLossFase2 - capitaleSuProp) / 2.5;
        }
      }
      
      // Logica speciale per OneFunded in operazione = successiva
      if (isOneFunded && operazione === 2) {
        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
        
        if (fase === 1) {
          // FASE 1: Formule proporzionali per tutti i livelli
          // Moltiplicatori: [1, 2, 5, 10, 20]
          const moltiplicatori = [1, 2, 5, 10, 20];
          const moltiplicatore = moltiplicatori[livelloUtente - 1];
          
          // Valore per stop loss successiva: [5352, 10704, 26760, 53520, 107040]
          const valoreStopLossSuccessiva = 5352 * moltiplicatore;
          
          // Stop Loss Prop: valore - cap prop
          return valoreStopLossSuccessiva - capitaleSuProp;
        }
        
        // Fase 2: Formule proporzionali
        // Moltiplicatori: [1, 2, 5, 10, 20]
        const moltiplicatori = [1, 2, 5, 10, 20];
        const moltiplicatore = moltiplicatori[livelloUtente - 1];
        
        // Valore per stop loss successiva fase 2: [5202, 10404, 26010, 52020, 104040]
        const valoreStopLossSuccessivaFase2 = 5202 * moltiplicatore;
        
        // Stop Loss Prop Fase 2 Operazione Successiva: valore - cap prop
        return valoreStopLossSuccessivaFase2 - capitaleSuProp;
      }
      
      // Logica unificata per gli altri provider
      const providerKey = isFundingPips ? 'fundingpips' :
                         isFundingTraders ? 'fundingtraders' :
                         isMasterFunders ? 'masterfunders' :
                         isFintokei ? 'fintokei' : 'fundednext';
      
      const values = baseValues[providerKey];
      const targetValue = (fase === 1 ? values.fase1 : values.fase2) * multiplier;
      const thresholdValue = values.thresholdFase2 * multiplier;
      
      if (fase === 1) {
        if (operazione === 1) {
          return (targetValue - capitaleSuProp) / 3;
        } else {
          return profittoOggi === 0 ? 0 : targetValue - capitaleSuProp;
        }
      } else {
        if (operazione === 1) {
          // Gestione soglie specifiche per Fase 2
          const threshold = isFundingPips ? (livelloUtente <= 2 ? thresholdValue + (targetValue - values.fase2 * multiplier) : thresholdValue) :
                           thresholdValue;
          
          if (capitaleSuProp < threshold) {
            return (targetValue - capitaleSuProp) / 3;
          } else {
            return (targetValue - capitaleSuProp) / 2;
          }
        } else {
          return profittoOggi === 0 ? 0 : targetValue - capitaleSuProp;
        }
      }
    };

    // Calcolo Take Profit ottimizzato con soglie parametrizzabili
    const getTakeProfit = () => {
      // Logica speciale per Fintokei in operazione = successiva
      if (isFintokei && operazione === 2) {
        const moltiplicatori = [1, 2, 4, 10, 20];
        const moltiplicatore = moltiplicatori[livelloUtente - 1];
        
        const baseValue = 235 * moltiplicatore; // [235, 470, 940, 2350, 4700]
        const capValue = 130 * moltiplicatore;  // [130, 260, 520, 1300, 2600]
        
        let takeProfit;
        if (baseValue + profittoOggi <= capValue) {
          takeProfit = baseValue + profittoOggi;
        } else {
          takeProfit = capValue;
        }
        
        return takeProfit;
      }
      
      // Logica speciale per OneFunded in operazione = prima
      if (isOneFunded && operazione === 1) {
        if (fase === 1) {
          // FASE 1: Formule proporzionali per tutti i livelli
          // Moltiplicatori: [1, 2, 5, 10, 20]
          const moltiplicatori = [1, 2, 5, 10, 20];
          const moltiplicatore = moltiplicatori[livelloUtente - 1];
          
          // Soglia per take profit: [4660, 9320, 23300, 46600, 93200]
          const sogliaTP = 4660 * moltiplicatore;
          
          // Take profit fisso: [160, 320, 800, 1600, 3200]
          const takeProfitFisso = 160 * moltiplicatore;
          
          // Threshold minimo: [4502, 9004, 22510, 45020, 90040]
          const thresholdMinimo = 4502 * moltiplicatore;
          
          // Take Profit Prop: Se cap prop > soglia → fisso, altrimenti → cap prop - threshold
          if (capitaleSuProp > sogliaTP) {
            return takeProfitFisso;
          } else {
            return capitaleSuProp - thresholdMinimo;
          }
        } else {
          // Fase 2: Formule proporzionali (uguale per operazione prima e successiva)
          // Moltiplicatori: [1, 2, 5, 10, 20]
          const moltiplicatori = [1, 2, 5, 10, 20];
          const moltiplicatore = moltiplicatori[livelloUtente - 1];
          
          // Soglia per take profit fase 2 (stessa della fase 1): [4660, 9320, 23300, 46600, 93200]
          const sogliaTP = 4660 * moltiplicatore;
          
          // Take profit fisso fase 2 (stesso della fase 1): [160, 320, 800, 1600, 3200]
          const takeProfitFisso = 160 * moltiplicatore;
          
          // Threshold minimo fase 2 (stesso della fase 1): [4502, 9004, 22510, 45020, 90040]
          const thresholdMinimo = 4502 * moltiplicatore;
          
          // Take Profit Prop Fase 2: Se cap prop > soglia → fisso, altrimenti → cap prop - threshold
          // NOTA: NON include profitto (uguale per op prima e successiva)
          if (capitaleSuProp > sogliaTP) {
            return takeProfitFisso;
          } else {
            return capitaleSuProp - thresholdMinimo;
          }
        }
      }
      
      // Logica speciale per OneFunded in operazione = successiva
      if (isOneFunded && operazione === 2) {
        if (fase === 1) {
          // FASE 1: Formule proporzionali per tutti i livelli
          // Moltiplicatori: [1, 2, 5, 10, 20]
          const moltiplicatori = [1, 2, 5, 10, 20];
          const moltiplicatore = moltiplicatori[livelloUtente - 1];
          
          // Soglia per take profit: [4660, 9320, 23300, 46600, 93200]
          const sogliaTP = 4660 * moltiplicatore;
          
          // Take profit fisso: [160, 320, 800, 1600, 3200]
          const takeProfitFisso = 160 * moltiplicatore;
          
          // Threshold minimo: [4502, 9004, 22510, 45020, 90040]
          const thresholdMinimo = 4502 * moltiplicatore;
          
          // Take Profit Prop: Se cap prop > soglia + profitto → fisso + profitto, altrimenti → cap prop + profitto - threshold
          if (capitaleSuProp > sogliaTP + profittoOggi) {
            return takeProfitFisso + profittoOggi;
          } else {
            return capitaleSuProp + profittoOggi - thresholdMinimo;
          }
        }
        
        // Fase 2: Formule proporzionali (uguale per operazione prima e successiva)
        // Moltiplicatori: [1, 2, 5, 10, 20]
        const moltiplicatori = [1, 2, 5, 10, 20];
        const moltiplicatore = moltiplicatori[livelloUtente - 1];
        
        // Soglia per take profit fase 2 (stessa della fase 1): [4660, 9320, 23300, 46600, 93200]
        const sogliaTP = 4660 * moltiplicatore;
        
        // Take profit fisso fase 2 (stesso della fase 1): [160, 320, 800, 1600, 3200]
        const takeProfitFisso = 160 * moltiplicatore;
        
        // Threshold minimo fase 2 (stesso della fase 1): [4502, 9004, 22510, 45020, 90040]
        const thresholdMinimo = 4502 * moltiplicatore;
        
        // Take Profit Prop Fase 2: Se cap prop > soglia → fisso, altrimenti → cap prop - threshold
        // NOTA: NON include profitto (uguale per op prima e successiva)
        if (capitaleSuProp > sogliaTP) {
          return takeProfitFisso;
        } else {
          return capitaleSuProp - thresholdMinimo;
        }
      }
      
      // Calcolo capitale di default e costanti per il livello corrente
      const capitaliDefault = currentSheet === 'The5ers' 
        ? [5000, 10000, 20000, 60000, 100000]
        : currentSheet === 'Fintokei'
        ? [5000, 10000, 20000, 50000, 100000]
        : getCapitalTiers(currentSheet);
      const capitaleDefault = capitaliDefault[livelloUtente - 1];
      const sheetConstant = SHEET_CONSTANTS[currentSheet.toLowerCase()] || 1;
      const sogliaCostante = capitaleDefault * sheetConstant;
      
      // Configurazione parametrizzata per Take Profit
      const takeProfitConfig = {
        targets: config.targets || [4600, 9200, 23000, 46000, 92000],
        soglie180: config.soglie180 || [200, 400, 1000, 2000, 4000],
        getThreshold: config.getThreshold || ((operazione, livello) => {
          const base = config.thresholds || [4602, 9204, 23010, 46020, 92040];
          return base[livello - 1];
        }),
        getValore130: (isSogliaExceeded, operazione, capitaleSuProp, livelloUtente) => {
          // Calcolo parametrizzato del valore130 basato su provider e condizioni
          const baseMultiplier = livelloUtente === 1 ? 1 : 
                                livelloUtente === 2 ? 2 : 
                                livelloUtente === 3 ? 5 : 
                                livelloUtente === 4 ? 10 : 20;
          
          const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
          
          const providerMultipliers = {
            fundingpips: isSogliaExceeded ? (fase === 1 ? [230, 460, 1170, 2340, 4680] : [225, 450, 1150, 2300, 4600]) : [245, 490, 1225, 2450, 4900],
            fundingtraders: isSogliaExceeded ? 
              (fase === 1 ? [230, 460, 1170, 2340, 4680] : [225, 450, 1150, 2300, 4600]) : 
              [245, 490, 1225, 2450, 4900],
            masterfunders: (operazione === 1 || capitaleSuProp >= capitaleDefault) ? 
              (isSogliaExceeded ? [237, 474, 1185, 2370, 4740] : [245, 490, 1225, 2450, 4900]) :
              (isSogliaExceeded ? [210, 420, 1050, 2100, 4200] : [245, 490, 1225, 2450, 4900]),
            the5ers: isSogliaExceeded ? (fase === 1 ? [235, 470, 1190, 2380, 4760] : [230, 460, 1170, 2340, 4680]) : [245, 490, 1225, 2450, 4900],
            fintokei: isSogliaExceeded ? [135, 270, 540, 1350, 2700] : [135, 270, 540, 1350, 2700],
            fundednext: isSogliaExceeded ? (fase === 1 ? [190, 380, 950, 1900, 3800] : [185, 370, 925, 1850, 3700]) : [198, 396, 990, 1980, 3960],
            onefunded: isSogliaExceeded ? (fase === 1 ? [190, 380, 950, 1900, 3800] : [185, 370, 925, 1850, 3700]) : [198, 396, 990, 1980, 3960]
          };
          
          return providerMultipliers[config.key][livelloUtente - 1];
        }
      };
      
      const target = takeProfitConfig.targets[livelloUtente - 1];
      const soglia180 = takeProfitConfig.soglie180[livelloUtente - 1];
      const threshold = takeProfitConfig.getThreshold(operazione, livelloUtente, capitaleSuProp);
      const isSogliaExceeded = capitaleSuProp > sogliaCostante;
      let valore130 = takeProfitConfig.getValore130(isSogliaExceeded, operazione, capitaleSuProp, livelloUtente);
      
      // Solo per FundingPips in operazione successiva: riduzione 5%
      if (config.key === 'fundingpips' && operazione === 2) {
        valore130 = Math.round(valore130 * 0.95);
      }
      
      // Logica unificata per tutti i provider
      if (operazione === 1) {
        if (capitaleSuProp - target < soglia180) {
          return capitaleSuProp - threshold;
        } else {
          return valore130;
        }
      } else {
        if (capitaleSuProp - profittoOggi - target < soglia180) {
          return capitaleSuProp - threshold;
        } else {
          return valore130 + profittoOggi;
        }
      }
    };

    const stopLossPips = getStopLoss();
    let takeProfitPips = getTakeProfit();
    
    // Logica speciale per The5ers, Fintokei e FundingPips quando "2 Take Profit?" è su "No" - SOVRASCRIVE i calcoli normali
    let finalStopLossPips = stopLossPips;
    let finalTakeProfitPips = takeProfitPips;
    
    // Modifica speciale per FundingTraders operazione "Prima": dividi take profit per 2.2
    if (currentSheet === 'FundingTraders' && operazione === 1) {
      // Condizione speciale Fase 1: se capitaleSuProp > soglia, take profit fisso
      if (fase === 1) {
        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
        const soglia = capitaleDefault * 1.04;
        
        if (capitaleSuProp > soglia) {
          // Take profit fisso proporzionale per livello
          const takeProfitFisso = [175, 350, 875, 1750, 3500];
          finalTakeProfitPips = takeProfitFisso[livelloUtente - 1];
        } else {
          // Altrimenti dividi per 2.2
          finalTakeProfitPips = finalTakeProfitPips / 2.2;
        }
      } else if (fase === 2) {
        // Condizione speciale Fase 2: se capitaleSuProp > soglia, take profit fisso
        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
        const soglia = capitaleDefault * 1.02;
        
        if (capitaleSuProp > soglia) {
          // Take profit fisso proporzionale per livello (stesso di Fase 1)
          const takeProfitFisso = [175, 350, 875, 1750, 3500];
          finalTakeProfitPips = takeProfitFisso[livelloUtente - 1];
        } else {
          // Altrimenti dividi per 2.2
          finalTakeProfitPips = finalTakeProfitPips / 2.2;
        }
      } else {
        // Altre fasi: dividi per 2.2
        finalTakeProfitPips = finalTakeProfitPips / 2.2;
      }
    }
    
    if ((isThe5ers || isFintokei || isFundingPips || isFundingTraders) && !hasTakeProfit) {
      // Condizione speciale per The5ers tutti i livelli, operazione successiva
      if (isThe5ers && operazione === 2) {
        const valoriBase = [30, 60, 120, 360, 600]; // Valori base per livelli 1-5
        const valoreLivello = valoriBase[livelloUtente - 1];
        const sogliaMin = SOGLIA_MIN['the5ers'][livelloUtente - 1];
        
        finalStopLossPips = valoreLivello - profittoOggi;
        // Calcola take profit provvisorio
        const takeProfitProvvisorio = finalStopLossPips * 1.2;
        
        // Verifica se capitale prop - take profit > soglia_min
        if (capitaleSuProp - takeProfitProvvisorio > sogliaMin) {
          // Take Profit = Stop Loss × 1.2
          finalTakeProfitPips = takeProfitProvvisorio;
        } else {
          // Take Profit = capitale prop - soglia_min
          finalTakeProfitPips = capitaleSuProp - sogliaMin;
        }
      } else {
        // Logica normale per altri casi
        const soglie = isFintokei ? {
          // Soglie per Fintokei (livello 3 adattato per capitale 20000)
          1: { alto: 4950, medio: 4900, base: 5000, stopAlto: 30, stopMedio: 50, minCapitale: 4502, sogliaSpeciale: 4725 },
          2: { alto: 9900, medio: 9800, base: 10000, stopAlto: 60, stopMedio: 100, minCapitale: 9004, sogliaSpeciale: 9450 },
          3: { alto: 19800, medio: 19600, base: 20000, stopAlto: 120, stopMedio: 200, minCapitale: 18006, sogliaSpeciale: 18900 },
          4: { alto: 49500, medio: 49000, base: 50000, stopAlto: 300, stopMedio: 500, minCapitale: 45020, sogliaSpeciale: 47250 },
          5: { alto: 99000, medio: 98000, base: 100000, stopAlto: 600, stopMedio: 1000, minCapitale: 90040, sogliaSpeciale: 94500 }
        } : {
          // Soglie The5ers (usate anche da FundingPips)
          1: { alto: 4950, medio: 4900, base: 5000, stopAlto: 30, stopMedio: 50, minCapitale: 4502, sogliaSpeciale: 4725 },
          2: { alto: 9900, medio: 9800, base: 10000, stopAlto: 60, stopMedio: 100, minCapitale: 9004, sogliaSpeciale: 9450 },
          3: { alto: 19800, medio: 19600, base: 20000, stopAlto: 120, stopMedio: 200, minCapitale: 18008, sogliaSpeciale: 18900 },
          4: { alto: 59400, medio: 58800, base: 60000, stopAlto: 360, stopMedio: 600, minCapitale: 54024, sogliaSpeciale: 56700 },
          5: { alto: 99000, medio: 98000, base: 100000, stopAlto: 600, stopMedio: 1000, minCapitale: 90040, sogliaSpeciale: 94500 }
        };
        
        const livello = soglie[livelloUtente];
        
        // Condizione speciale: se capitale < sogliaSpeciale, Stop Loss = capitale - minCapitale
        if (capitaleSuProp < livello.sogliaSpeciale) {
          finalStopLossPips = capitaleSuProp - livello.minCapitale;
          // Take Profit = Stop Loss × 1.2
          finalTakeProfitPips = finalStopLossPips * 1.2;
        } else {
          // Logica normale
          if (capitaleSuProp > livello.alto) {
            finalStopLossPips = livello.stopAlto;
            // Take Profit = Stop Loss × 40/30
            finalTakeProfitPips = finalStopLossPips * (40/30);
          } else if (capitaleSuProp > livello.medio && capitaleSuProp <= livello.alto) {
            finalStopLossPips = livello.stopMedio;
            // Take Profit = Stop Loss × 1.2
            finalTakeProfitPips = finalStopLossPips * 1.2;
          } else {
            finalStopLossPips = (livello.base - capitaleSuProp) / 2;
            // Take Profit = Stop Loss × 1.2
            finalTakeProfitPips = finalStopLossPips * 1.2;
          }
        }
        
        // PROTEZIONE minCapitale: Verifica che il capitale meno il take profit non scenda sotto minCapitale
        const capitaleDopoTakeProfit = capitaleSuProp - finalTakeProfitPips;
        
        if (capitaleDopoTakeProfit < livello.minCapitale) {
          // Ricalcola il take profit per mantenere il capitale a minCapitale
          finalTakeProfitPips = capitaleSuProp - livello.minCapitale;
          
          // Ricalcola lo stop loss in proporzione inversa
          if (capitaleSuProp > livello.alto) {
            finalStopLossPips = finalTakeProfitPips * (30/40); // Inverso di 40/30
          } else {
            finalStopLossPips = finalTakeProfitPips / 1.2; // Inverso di 1.2
          }
        }
      }
    }
    
    // Regola aggiuntiva per Fintokei: se cap prop - take profit prop < soglia, modifica stop loss
    if (isFintokei) {
      const soglieFintokei = [4500, 9000, 18000, 45000, 90000]; // Moltiplicatori [1, 2, 4, 10, 20]
      const sogliaMinimaFintokei = SOGLIA_MIN['fintokei'][livelloUtente - 1]; // [4502, 9004, 18006, 45020, 90040]
      
      if (capitaleSuProp - finalTakeProfitPips < soglieFintokei[livelloUtente - 1]) {
        finalStopLossPips = capitaleSuProp - sogliaMinimaFintokei;
      }
    }
    
    // Limite MINIMO Take Profit per MasterFunders: non può essere più negativo di -80$ × moltiplicatore (PRIORITARIO, si applica DOPO tutte le altre modifiche)
    // NOTA: a causa di uno swap nell'interfaccia, finalStopLossPips è quello mostrato come "TAKE PROFIT PROP"
    if (config.key === 'masterfunders') {
      const minTakeProfit = [-80, -160, -400, -800, -1600][livelloUtente - 1];
      
      // Se è più negativo del minimo, limita al minimo
      if (finalStopLossPips < minTakeProfit) {
        finalStopLossPips = minTakeProfit;
      }
      if (finalTakeProfitPips < minTakeProfit) {
        finalTakeProfitPips = minTakeProfit;
      }
    }
    
    const maxPips = Math.max(finalStopLossPips, finalTakeProfitPips);
    
    // Calcolo lotti finali con aggiustamenti usando configurazione centralizzata
    let lottiAxi = m8;
    const soglie = config.soglie || [200, 400, 1000, 2000, 4000];
    const soglie2 = config.soglie2 || [350, 700, 1750, 3500, 7000];
    
    // Adjustments basati su fase e foglio usando configurazione
    const adjustments = config.adjustments[`fase${fase}`];
    const adjustments1 = adjustments.adj1;
    const adjustments2 = adjustments.adj2;
    
    // Applicazione degli aggiustamenti
    if (maxPips < soglie[livelloUtente - 1]) {
      lottiAxi = m8 - adjustments1[livelloUtente - 1];
    } else if (maxPips < soglie2[livelloUtente - 1]) {
      lottiAxi = m8 - adjustments2[livelloUtente - 1];
    }

    const lottiProp = lottiAxi / l8_base[livelloUtente - 1];
    
    // Logica speciale per Lotti Axi su The5ers, Fintokei, FundingPips e FundingTraders quando "Primo giorno completato?" è su "No"
    let finalLottiAxi = lottiAxi;
    let finalLottiProp = lottiProp;
    
    if ((isThe5ers || isFintokei || isFundingPips || isFundingTraders) && !hasTakeProfit) {
      if (isThe5ers) {
        // Nuova logica per The5ers: Lotti Broker basati su Take Profit Prop
        if (fase === 1) {
          // Fase 1: take profit prop / 7500, arrotondato per eccesso al secondo decimale
          finalLottiAxi = Math.ceil((finalTakeProfitPips / 7500) * 100) / 100;
        } else {
          // Fase 2: take profit prop / 5000, arrotondato per eccesso al secondo decimale
          finalLottiAxi = Math.ceil((finalTakeProfitPips / 5000) * 100) / 100;
        }
        
        // Calcolo Lotti Prop speciale: Lotti Axi / l8_base
        finalLottiProp = finalLottiAxi / l8_base[livelloUtente - 1];
      } else {
        // Logica originale per Fintokei, FundingPips e FundingTraders
        // Soglie aggiornate per ogni livello basate sui moltiplicatori [1, 2, 4, 12, 20]
        // Valori diversi per Fase 1 e Fase 2
        const soglieLotti = isFintokei ? 
          // Fintokei - Livello 3 adattato per capitale 20000
          (fase === 1 ? {
            1: { soglia1: 70, soglia2: 140, soglia3: 200, lotto1: 0.01, lotto2: 0.02, lotto3: 0.03, lotto4: 0.04 },
            2: { soglia0: 70, soglia1: 140, soglia2: 280, soglia3: 400, lotto0: 0.01, lotto1: 0.02, lotto2: 0.04, lotto3: 0.06, lotto4: 0.08 },
            3: { soglia0: 112, soglia1: 224, soglia2: 448, soglia3: 640, lotto0: 0.016, lotto1: 0.032, lotto2: 0.064, lotto3: 0.096, lotto4: 0.128 },
            4: { soglia0: 420, soglia1: 840, soglia2: 1680, soglia3: 2400, lotto0: 0.06, lotto1: 0.12, lotto2: 0.24, lotto3: 0.36, lotto4: 0.48 },
            5: { soglia0: 700, soglia1: 1400, soglia2: 2800, soglia3: 4000, lotto0: 0.10, lotto1: 0.20, lotto2: 0.40, lotto3: 0.60, lotto4: 0.80 }
          } : {
            1: { soglia1: 70, soglia2: 140, soglia3: 200, lotto1: 0.02, lotto2: 0.03, lotto3: 0.04, lotto4: 0.06 },
            2: { soglia0: 70, soglia1: 140, soglia2: 280, soglia3: 400, lotto0: 0.02, lotto1: 0.04, lotto2: 0.06, lotto3: 0.08, lotto4: 0.12 },
            3: { soglia0: 112, soglia1: 224, soglia2: 448, soglia3: 640, lotto0: 0.032, lotto1: 0.064, lotto2: 0.096, lotto3: 0.128, lotto4: 0.192 },
            4: { soglia0: 420, soglia1: 840, soglia2: 1680, soglia3: 2400, lotto0: 0.12, lotto1: 0.24, lotto2: 0.36, lotto3: 0.48, lotto4: 0.72 },
            5: { soglia0: 700, soglia1: 1400, soglia2: 2800, soglia3: 4000, lotto0: 0.20, lotto1: 0.40, lotto2: 0.60, lotto3: 0.80, lotto4: 1.20 }
          })
          :
          // FundingPips - Valori originali (non usati più per The5ers)
          (fase === 1 ? {
            1: { soglia1: 70, soglia2: 140, soglia3: 200, lotto1: 0.01, lotto2: 0.02, lotto3: 0.03, lotto4: 0.04 },
            2: { soglia0: 70, soglia1: 140, soglia2: 280, soglia3: 400, lotto0: 0.01, lotto1: 0.02, lotto2: 0.04, lotto3: 0.06, lotto4: 0.08 },
            3: { soglia0: 140, soglia1: 280, soglia2: 560, soglia3: 800, lotto0: 0.02, lotto1: 0.04, lotto2: 0.08, lotto3: 0.12, lotto4: 0.16 },
            4: { soglia0: 420, soglia1: 840, soglia2: 1680, soglia3: 2400, lotto0: 0.06, lotto1: 0.12, lotto2: 0.24, lotto3: 0.36, lotto4: 0.48 },
            5: { soglia0: 700, soglia1: 1400, soglia2: 2800, soglia3: 4000, lotto0: 0.10, lotto1: 0.20, lotto2: 0.40, lotto3: 0.60, lotto4: 0.80 }
          } : {
            1: { soglia1: 70, soglia2: 140, soglia3: 200, lotto1: 0.02, lotto2: 0.03, lotto3: 0.04, lotto4: 0.06 },
            2: { soglia0: 70, soglia1: 140, soglia2: 280, soglia3: 400, lotto0: 0.02, lotto1: 0.04, lotto2: 0.06, lotto3: 0.08, lotto4: 0.12 },
            3: { soglia0: 140, soglia1: 280, soglia2: 560, soglia3: 800, lotto0: 0.04, lotto1: 0.08, lotto2: 0.12, lotto3: 0.16, lotto4: 0.24 },
            4: { soglia0: 420, soglia1: 840, soglia2: 1680, soglia3: 2400, lotto0: 0.12, lotto1: 0.24, lotto2: 0.36, lotto3: 0.48, lotto4: 0.72 },
            5: { soglia0: 700, soglia1: 1400, soglia2: 2800, soglia3: 4000, lotto0: 0.20, lotto1: 0.40, lotto2: 0.60, lotto3: 0.80, lotto4: 1.20 }
          });
        
        const livello = soglieLotti[livelloUtente];
        
        // Gestione per tutti i livelli con soglia aggiuntiva (tranne livello 1)
        if (livelloUtente === 1) {
          // Livello 1 mantiene 4 soglie
          if (finalStopLossPips < livello.soglia1) {
            finalLottiAxi = livello.lotto1;
          } else if (finalStopLossPips >= livello.soglia1 && finalStopLossPips < livello.soglia2) {
            finalLottiAxi = livello.lotto2;
          } else if (finalStopLossPips >= livello.soglia2 && finalStopLossPips < livello.soglia3) {
            finalLottiAxi = livello.lotto3;
          } else if (finalStopLossPips >= livello.soglia3) {
            finalLottiAxi = livello.lotto4;
          }
        } else {
          // Livelli 2-5 hanno 5 soglie con soglia0
          if (finalStopLossPips < livello.soglia0) {
            finalLottiAxi = livello.lotto0;
          } else if (finalStopLossPips >= livello.soglia0 && finalStopLossPips < livello.soglia1) {
            finalLottiAxi = livello.lotto1;
          } else if (finalStopLossPips >= livello.soglia1 && finalStopLossPips < livello.soglia2) {
            finalLottiAxi = livello.lotto2;
          } else if (finalStopLossPips >= livello.soglia2 && finalStopLossPips < livello.soglia3) {
            finalLottiAxi = livello.lotto3;
          } else if (finalStopLossPips >= livello.soglia3) {
            finalLottiAxi = livello.lotto4;
          }
        }
        
        // Calcolo Lotti Prop speciale: Lotti Axi / l8_base
        finalLottiProp = finalLottiAxi / l8_base[livelloUtente - 1];
      }
    }
    
    // Calcolo commissioni in base al simbolo
    const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
    const isEURUSD = (isMasterFunders && operazione === 2 && capitaleSuProp < capitaleDefault) 
                  || (isFundingTraders && operazione === 2)
                  || (isThe5ers && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5));
    const commissioni = finalLottiAxi * (isEURUSD ? 10 : 40);
    
    const moltiplicatore = ((isMasterFunders && operazione === 2 && capitaleSuProp < capitaleDefault) 
                         || (isFundingTraders && operazione === 2)
                         || (isThe5ers && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5))) ? 100000 : 100; // XAUUSD per tutti gli altri
    
    const stopLossPrezzo = tipoOperazione === 'BUY' ? 
      prezzoIngresso + finalStopLossPips / (finalLottiProp * moltiplicatore) :
      prezzoIngresso - finalStopLossPips / (finalLottiProp * moltiplicatore);
    
    const takeProfitPrezzo = tipoOperazione === 'BUY' ?
      prezzoIngresso - finalTakeProfitPips / (finalLottiProp * moltiplicatore) :
      prezzoIngresso + finalTakeProfitPips / (finalLottiProp * moltiplicatore);

    const stopLossAxiPrezzo = tipoOperazione === 'BUY'
      ? takeProfitPrezzo + (() => {
          const isEURUSD = (isMasterFunders && operazione === 2 && capitaleSuProp < capitaleDefault) 
                        || (isFundingTraders && operazione === 2)
                        || (isThe5ers && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5));
          if (isEURUSD) {
            // EURUSD: offset = (spread eurusd prop + spread eurusd broker) / 200000
            const providerKey = currentSheet.toLowerCase();
            const spreadEurusdProp = SPREAD_CONSTANTS[providerKey]?.eurusd || 0;
            const spreadEurusdBroker = SPREAD_CONSTANTS.broker.eurusd;
            return (spreadEurusdProp + spreadEurusdBroker) / 200000;
          } else {
            // XAUUSD: offset = (spread oro prop + spread oro broker) / 200
            const providerKey = currentSheet.toLowerCase();
            const spreadOroProp = SPREAD_CONSTANTS[providerKey]?.oro || 0;
            const spreadOroBroker = SPREAD_CONSTANTS.broker.oro;
            return (spreadOroProp + spreadOroBroker) / 200;
          }
        })()
      : takeProfitPrezzo - (() => {
          const isEURUSD = (isMasterFunders && operazione === 2 && capitaleSuProp < capitaleDefault) 
                        || (isFundingTraders && operazione === 2)
                        || (isThe5ers && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5));
          if (isEURUSD) {
            // EURUSD: offset = (spread eurusd prop + spread eurusd broker) / 200000
            const providerKey = currentSheet.toLowerCase();
            const spreadEurusdProp = SPREAD_CONSTANTS[providerKey]?.eurusd || 0;
            const spreadEurusdBroker = SPREAD_CONSTANTS.broker.eurusd;
            return (spreadEurusdProp + spreadEurusdBroker) / 200000;
          } else {
            // XAUUSD: offset = (spread oro prop + spread oro broker) / 200
            const providerKey = currentSheet.toLowerCase();
            const spreadOroProp = SPREAD_CONSTANTS[providerKey]?.oro || 0;
            const spreadOroBroker = SPREAD_CONSTANTS.broker.oro;
            return (spreadOroProp + spreadOroBroker) / 200;
          }
        })();

    const takeProfitAxiPrezzo = tipoOperazione === 'BUY'
      ? stopLossPrezzo + (() => {
          const isEURUSD = (isMasterFunders && operazione === 2 && capitaleSuProp < capitaleDefault) 
                        || (isFundingTraders && operazione === 2)
                        || (isThe5ers && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5));
          if (isEURUSD) {
            // EURUSD: offset = (spread eurusd prop + spread eurusd broker) / 200000
            const providerKey = currentSheet.toLowerCase();
            const spreadEurusdProp = SPREAD_CONSTANTS[providerKey]?.eurusd || 0;
            const spreadEurusdBroker = SPREAD_CONSTANTS.broker.eurusd;
            return (spreadEurusdProp + spreadEurusdBroker) / 200000;
          } else {
            // XAUUSD: offset = (spread oro prop + spread oro broker) / 200
            const providerKey = currentSheet.toLowerCase();
            const spreadOroProp = SPREAD_CONSTANTS[providerKey]?.oro || 0;
            const spreadOroBroker = SPREAD_CONSTANTS.broker.oro;
            return (spreadOroProp + spreadOroBroker) / 200;
          }
        })()
      : stopLossPrezzo - (() => {
          const isEURUSD = (isMasterFunders && operazione === 2 && capitaleSuProp < capitaleDefault) 
                        || (isFundingTraders && operazione === 2)
                        || (isThe5ers && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5));
          if (isEURUSD) {
            // EURUSD: offset = (spread eurusd prop + spread eurusd broker) / 200000
            const providerKey = currentSheet.toLowerCase();
            const spreadEurusdProp = SPREAD_CONSTANTS[providerKey]?.eurusd || 0;
            const spreadEurusdBroker = SPREAD_CONSTANTS.broker.eurusd;
            return (spreadEurusdProp + spreadEurusdBroker) / 200000;
          } else {
            // XAUUSD: offset = (spread oro prop + spread oro broker) / 200
            const providerKey = currentSheet.toLowerCase();
            const spreadOroProp = SPREAD_CONSTANTS[providerKey]?.oro || 0;
            const spreadOroBroker = SPREAD_CONSTANTS.broker.oro;
            return (spreadOroProp + spreadOroBroker) / 200;
          }
        })();

    // Calcolo Stop Loss Broker Dollari e Take Profit Broker Dollari per OneFunded
    let stopLossBrokerDollari, takeProfitBrokerDollari, stopLossPropDollari, takeProfitPropDollari;
    
    if (currentSheet === 'OneFunded') {
      // Per OneFunded, usa spread oro broker + OneFunded per calcolare commissioni
      const spreadOroBroker = SPREAD_CONSTANTS.broker.oro; // 13
      const spreadOroOneFunded = SPREAD_CONSTANTS.onefunded.oro; // 22
      const commissioni = spreadOroBroker + spreadOroOneFunded; // 13 + 22 = 35
      
      // Stop Loss Prop dollari = semplicemente i final pips
      stopLossPropDollari = finalStopLossPips;
      
      // Stop Loss Broker dollari = final pips * l8_base + (lotti broker * commissioni spread)
      stopLossBrokerDollari = finalStopLossPips * l8_base[livelloUtente - 1] + (finalLottiAxi * commissioni);
      
      // Take Profit Prop dollari = semplicemente i final pips
      takeProfitPropDollari = finalTakeProfitPips;
      
      // Take Profit Broker dollari = final pips * l8_base - (lotti broker * commissioni spread)
      takeProfitBrokerDollari = finalTakeProfitPips * l8_base[livelloUtente - 1] - (finalLottiAxi * commissioni);
    }

    setRisultati({
      lottiProp: Math.round(finalLottiProp * 100) / 100,
      lottiAxi: Math.round(finalLottiAxi * 100) / 100,
      stopLossPips: Math.round(finalStopLossPips),
      stopLossPrezzo: ((currentSheet === 'MasterFunders' && operazione === 2 && capitaleSuProp < capitaleDefault) 
                    || (currentSheet === 'FundingTraders' && operazione === 2)
                    || (currentSheet === 'The5ers' && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5))) 
                    ? Math.round(stopLossPrezzo * 100000) / 100000 : Math.round(stopLossPrezzo * 100) / 100,
      stopLossAxiPrezzo: ((currentSheet === 'MasterFunders' && operazione === 2 && capitaleSuProp < capitaleDefault) 
                       || (currentSheet === 'FundingTraders' && operazione === 2)
                       || (currentSheet === 'The5ers' && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5))) 
                       ? Math.round(stopLossAxiPrezzo * 100000) / 100000 : Math.round(stopLossAxiPrezzo * 100) / 100,
      takeProfitPips: Math.round(finalTakeProfitPips),
      takeProfitPrezzo: ((currentSheet === 'MasterFunders' && operazione === 2 && capitaleSuProp < capitaleDefault) 
                      || (currentSheet === 'FundingTraders' && operazione === 2)
                      || (currentSheet === 'The5ers' && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5))) 
                      ? Math.round(takeProfitPrezzo * 100000) / 100000 : Math.round(takeProfitPrezzo * 100) / 100,
      takeProfitAxiPrezzo: ((currentSheet === 'MasterFunders' && operazione === 2 && capitaleSuProp < capitaleDefault) 
                         || (currentSheet === 'FundingTraders' && operazione === 2)
                         || (currentSheet === 'The5ers' && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5))) 
                         ? Math.round(takeProfitAxiPrezzo * 100000) / 100000 : Math.round(takeProfitAxiPrezzo * 100) / 100,
      l8_base_current: l8_base[livelloUtente - 1],
      // Dollari per OneFunded (se applicabile)
      ...(currentSheet === 'OneFunded' && {
        stopLossPropDollari: Math.round(stopLossPropDollari * 100) / 100,
        stopLossBrokerDollari: Math.round(stopLossBrokerDollari * 100) / 100,
        takeProfitPropDollari: Math.round(takeProfitPropDollari * 100) / 100,
        takeProfitBrokerDollari: Math.round(takeProfitBrokerDollari * 100) / 100
      })
    });
  }, [capitaleFungina, fase, operazione, capitaleSuProp, profittoOggi, prezzoApprox, prezzoIngresso, tipoOperazione, livelloUtente, currentSheet, hasTakeProfit, fundingTradersPercentage]);

  // Calcoli per Calcolatore Popup
  useEffect(() => {
    if (!capitaleCalc || !propCalcolatore || !prezzoEurusdCalc) {
      setLottiPropCalc(0);
      setLottiBrokerCalc(0);
      return;
    }

    const capitale = Number(capitaleCalc);
    const prezzoEurusd = Number(prezzoEurusdCalc);
    
    // Calcolo Lotti Prop = Capitale / (Prezzo Approx × 2000)
    const lottiProp = capitale / (prezzoEurusd * 2000);
    
    // Recupera l8_base per la prop selezionata (usa fase1 e livelloUtente corrente)
    const providerConfig = Object.values(PROVIDER_CONFIG).find(
      config => config.key === propCalcolatore
    );
    
    if (!providerConfig) {
      setLottiPropCalc(0);
      setLottiBrokerCalc(0);
      return;
    }
    
    // Usa fase1 e livello utente corrente
    // Per FundingTraders usa l8_base dinamici in base alla percentuale selezionata
    const l8_base = propCalcolatore === 'fundingtraders'
      ? getFundingTradersL8Base(fundingTradersPercentage, 1)[livelloUtente - 1]
      : providerConfig.l8_base.fase1[livelloUtente - 1];
    
    // Calcolo Lotti Broker (Axi) = Lotti Prop × l8_base
    const lottiBroker = lottiProp * l8_base;
    
    // Arrotonda a 2 decimali
    setLottiPropCalc(Math.round(lottiProp * 100) / 100);
    setLottiBrokerCalc(Math.round(lottiBroker * 100) / 100);
    
    // Calcola Take Profit Prop e Stop Loss Prop in base alla direzione
    if (profittoDesiderato && lottiProp > 0 && prezzoIngressoPropCalc) {
      const profitto = Number(profittoDesiderato);
      const prezzoIngresso = Number(prezzoIngressoPropCalc);
      const deltaProfitto = (profitto / 100000) / lottiProp;
      
      // Se BUY: aggiungi, se SELL: sottrai
      const takeProfitProp = direzioneCalc === 'BUY' 
        ? prezzoIngresso + deltaProfitto 
        : prezzoIngresso - deltaProfitto;
      
      setTakeProfitPropCalc(takeProfitProp);
      
      // Calcola Stop Loss Broker usando Take Profit Prop e spread
      // Recupera spread EURUSD dalla prop selezionata e dal broker
      const spreadProp = SPREAD_CONSTANTS[propCalcolatore]?.eurusd || 0;
      const spreadBroker = SPREAD_CONSTANTS.broker.eurusd;
      
      // Converti spread da pips a prezzo (dividi per 10000 per EURUSD con 5 decimali)
      const spreadCombinato = ((spreadProp + spreadBroker) / 20) / 10000;
      
      // Se BUY: aggiungi spread, se SELL: sottrai spread
      const stopLossBroker = direzioneCalc === 'BUY'
        ? takeProfitProp + spreadCombinato
        : takeProfitProp - spreadCombinato;
      
      setStopLossBrokerCalc(stopLossBroker);
    } else {
      setTakeProfitPropCalc(0);
      setStopLossBrokerCalc(0);
    }
    
    if (perditaDesiderata && lottiProp > 0 && prezzoIngressoPropCalc) {
      const perdita = Number(perditaDesiderata);
      const prezzoIngresso = Number(prezzoIngressoPropCalc);
      const deltaPerdita = (perdita / 100000) / lottiProp;
      
      // Se BUY: aggiungi, se SELL: sottrai
      const stopLossProp = direzioneCalc === 'BUY' 
        ? prezzoIngresso + deltaPerdita 
        : prezzoIngresso - deltaPerdita;
      
      setStopLossPropCalc(stopLossProp);
      
      // Calcola Take Profit Broker usando Stop Loss Prop e spread
      // Recupera spread EURUSD dalla prop selezionata e dal broker
      const spreadProp = SPREAD_CONSTANTS[propCalcolatore]?.eurusd || 0;
      const spreadBroker = SPREAD_CONSTANTS.broker.eurusd;
      
      // Converti spread da pips a prezzo (dividi per 10000 per EURUSD con 5 decimali)
      const spreadCombinato = ((spreadProp + spreadBroker) / 20) / 10000;
      
      // Se BUY: aggiungi spread, se SELL: sottrai spread
      const takeProfitBroker = direzioneCalc === 'BUY'
        ? stopLossProp + spreadCombinato
        : stopLossProp - spreadCombinato;
      
      setTakeProfitBrokerCalc(takeProfitBroker);
    } else {
      setStopLossPropCalc(0);
      setTakeProfitBrokerCalc(0);
    }
    
  }, [capitaleCalc, propCalcolatore, livelloUtente, profittoDesiderato, perditaDesiderata, prezzoIngressoPropCalc, direzioneCalc, prezzoEurusdCalc, fundingTradersPercentage]);

  // Calcoli per Fase Real - Stop Loss Prop 1 e 2
  useEffect(() => {
    if (currentSheet !== 'Fase Real' || !prop1 || !prop2 || !capitale1 || !capitale2) return;

    const cap1 = Number(capitale1);
    const cap2 = Number(capitale2);
    
    // Moltiplicatori per livelli: [x1, x2, x5, x10, x20]
    const moltiplicatoriLivello = [1, 2, 5, 10, 20];
    const moltiplicatore = moltiplicatoriLivello[livelloUtente - 1];
    
    // Ottieni i valori dalle costanti (indice = livello - 1)
    // Per dragon, usa fase2 come default nella Fase Real
    const getSogliaMin = (prop) => {
      const sogliaData = SOGLIA_MIN[prop];
      if (!sogliaData) return 0;
      if (prop === 'dragon' && sogliaData.fase1 && sogliaData.fase2) {
        return sogliaData.fase2[livelloUtente - 1];
      }
      return sogliaData[livelloUtente - 1] || 0;
    };
    
    const sogliaMin1 = getSogliaMin(prop1);
    const sogliaMin2 = getSogliaMin(prop2);
    let perditaMax1 = PERDITA_MAX[prop1]?.[livelloUtente - 1] || 0;
    let perditaMax2 = PERDITA_MAX[prop2]?.[livelloUtente - 1] || 0;
    const pesoProp1 = PROP_WEIGHTS[prop1] || 1;
    const pesoProp2 = PROP_WEIGHTS[prop2] || 1;
    // Calcola capitali base specifici per ogni prop
    const getCapitaleBase = (propKey) => {
      if (propKey === 'the5ers') {
        // The5ers ha capitali specifici: [5000, 10000, 20000, 60000, 100000]
        return [5000, 10000, 20000, 60000, 100000][livelloUtente - 1];
      } else if (propKey === 'fintokei') {
        // Fintokei ha capitali specifici: [5000, 10000, 20000, 50000, 100000]
        return [5000, 10000, 20000, 50000, 100000][livelloUtente - 1];
      } else {
        // Altri provider: getCapitalTiers(currentSheet)
        return getCapitalTiers(currentSheet)[livelloUtente - 1];
      }
    };
    
    const capitaleBaseProp1 = getCapitaleBase(prop1);
    const capitaleBaseProp2 = getCapitaleBase(prop2);

    // Calcola Stop Loss Prop 1 - NUOVA LOGICA SEMPLIFICATA
    let sl1 = 0;
    const diff1 = cap1 - sogliaMin1;
    const diff2 = cap2 - sogliaMin2;
    
    // LOGICA PER SL1
    if (prop1 === 'masterfunders' || prop1 === 'fundingpips' || prop1 === 'fundednext' || prop1 === 'onefunded' || prop1 === 'fintokei' || prop1 === 'fundingtraders') {
      // FundedNext usa sempre 120
      // FundingPips usa 120 per livelli 1-3, 80 per livelli 4-5
      // FundingTraders per utente "3": baseValue = 40
      // Altre prop usano sempre 80
      const baseValue = prop1 === 'fundednext' ? 120 : 
                        (prop1 === 'fundingpips' && livelloUtente <= 3) ? 120 : 
                        (prop1 === 'fundingtraders' && username === '3') ? 40 : 80;
      // sl1 = min(baseValue × moltiplicatore × pesoProp1, diff1)
      sl1 = Math.min(baseValue * moltiplicatore * pesoProp1, diff1);
    }
    else {
      // Se non è stata selezionata nessuna delle 2 prop delle condizioni sopra
      if (diff1 <= perditaMax1) {
        sl1 = diff1;
      }
      else if (diff2 <= perditaMax2) {
        sl1 = diff2 * (pesoProp1 / pesoProp2);
      }
      else if (cap1 > cap2) {
        // Calcolo sl2base per questa condizione
        // A questo punto diff2 > perditaMax2, quindi usiamo sempre la formula 0.40
        const sl2Base = (capitaleBaseProp2 - sogliaMin2) * 0.40;
        sl1 = sl2Base * (pesoProp1 / pesoProp2);
      }
      else {
        // default
        sl1 = (capitaleBaseProp1 - sogliaMin1) * 0.40;
      }
    }

    // Calcola Stop Loss Prop 2 - NUOVA LOGICA SEMPLIFICATA
    let sl2 = 0;
    // diff1 e diff2 già dichiarati sopra
    
    // LOGICA PER SL2
    if (prop2 === 'masterfunders' || prop2 === 'fundingpips' || prop2 === 'fundednext' || prop2 === 'onefunded' || prop2 === 'fintokei' || prop2 === 'fundingtraders') {
      // FundedNext usa sempre 120
      // FundingPips usa 120 per livelli 1-3, 80 per livelli 4-5
      // FundingTraders per utente "3": baseValue = 40
      // Altre prop usano sempre 80
      const baseValue = prop2 === 'fundednext' ? 120 : 
                        (prop2 === 'fundingpips' && livelloUtente <= 3) ? 120 : 
                        (prop2 === 'fundingtraders' && username === '3') ? 40 : 80;
      // sl2 = min(baseValue × moltiplicatore × pesoProp2, diff2)
      sl2 = Math.min(baseValue * moltiplicatore * pesoProp2, diff2);
    }
    else {
      // Se non è stata selezionata nessuna delle 2 prop delle condizioni sopra
      if (diff2 <= perditaMax2) {
        sl2 = diff2;
      }
      else if (diff1 <= perditaMax1) {
        sl2 = diff1 * (pesoProp2 / pesoProp1);
      }
      else if (cap1 <= cap2) {
        // Calcolo sl1base per questa condizione
        // A questo punto diff1 > perditaMax1, quindi usiamo sempre la formula 0.40
        const sl1Base = (capitaleBaseProp1 - sogliaMin1) * 0.40;
        sl2 = sl1Base * (pesoProp2 / pesoProp1);
      }
      else {
        // default
        sl2 = (capitaleBaseProp2 - sogliaMin2) * 0.40;
      }
    }

    // REGOLA SPECIALE PER ONEFUNDED - Stop loss prop opposta = 140 × moltiplicatore
    // Solo se la prop opposta NON ha già una restrizione
    if (prop1 === 'onefunded' || prop2 === 'onefunded') {
      const propsConRestrizioni = ['masterfunders', 'fundingpips', 'fundednext', 'onefunded', 'fintokei', 'fundingtraders'];
      
      if (prop1 === 'onefunded') {
        // OneFunded è prop1, controlla se prop2 NON ha restrizioni
        if (!propsConRestrizioni.includes(prop2)) {
          // Applica regola 140 × moltiplicatore per sl2
          sl2 = 140 * moltiplicatore * pesoProp2;
        }
      } else {
        // OneFunded è prop2, controlla se prop1 NON ha restrizioni
        if (!propsConRestrizioni.includes(prop1)) {
          // Applica regola 140 × moltiplicatore per sl1
          sl1 = 140 * moltiplicatore * pesoProp1;
        }
      }
    }

    setStopLossProp1Dollari(Math.round(sl1));
    setStopLossProp2Dollari(Math.round(sl2));

    // Calcola Take Profit usando le formule fornite
    const tp1 = sl2 * (pesoProp1 / pesoProp2);
    const tp2 = sl1 * (pesoProp2 / pesoProp1);
    
    setTakeProfitProp1Dollari(Math.round(tp1));
    setTakeProfitProp2Dollari(Math.round(tp2));

    // Calcola Lotti Prop 1 e 2 usando il valore assoluto più grande tra SL e TP
    const maxValue1 = Math.max(Math.abs(Math.round(sl1)), Math.abs(Math.round(tp1)));
    const maxValue2 = Math.max(Math.abs(Math.round(sl2)), Math.abs(Math.round(tp2)));
    
    // Divisore base per la fase Real
    // Regola speciale: per utente '3' con FundingTraders, aumenta del 50%
    const divisoreBase = (username === '3' && (prop1 === 'fundingtraders' || prop2 === 'fundingtraders')) ? 67.5 : 45;
    
    // Calcola Lotti Prop 1 con la nuova formula
    const calc_lotti_1 = maxValue1 / divisoreBase;
    const divisore1 = pesoProp1 * 5;
    const calc_lotti_2_prop1 = Math.round(calc_lotti_1 / divisore1) * divisore1;
    const lottiProp1 = calc_lotti_2_prop1 / 100;
    
    // Calcola Lotti Prop 2 con la nuova formula
    const calc_lotti_1_prop2 = maxValue2 / divisoreBase;
    const divisore2 = pesoProp2 * 5;
    const calc_lotti_2_prop2 = Math.round(calc_lotti_1_prop2 / divisore2) * divisore2;
    const lottiProp2 = calc_lotti_2_prop2 / 100;
    
    // Salva i risultati negli stati
    setLottiProp1Dollari(Math.round(lottiProp1 * 100) / 100);
    setLottiProp2Dollari(Math.round(lottiProp2 * 100) / 100);

    // Calcola Stop Loss e Take Profit in termini di prezzo (solo se prezzo ingresso è inserito)
    if (prezzoIngressoReal && prezzoIngressoReal !== '') {
      const prezzoIngresso = Number(prezzoIngressoReal);
      const moltiplicatore = 100; // Moltiplicatore per l'oro
      
      // Determina qual è la prop principale
      let propPrincipaleE1 = false; // true se prop1 è principale, false se prop2 è principale
      
      if (prop1 === 'masterfunders' || prop2 === 'masterfunders') {
        propPrincipaleE1 = prop1 === 'masterfunders';
      } else {
        const cap1 = Number(capitale1) || 0;
        const cap2 = Number(capitale2) || 0;
        if (cap1 <= cap2) {
          propPrincipaleE1 = true;
        } else if (cap2 < cap1) {
          propPrincipaleE1 = false;
        } else {
          propPrincipaleE1 = true; // Se uguali, prop1
        }
      }
      
      // Calcola prezzi per la prop principale con formule normali
      let stopLossPrincipale, takeProfitPrincipale;
      
      if (propPrincipaleE1) {
        // Prop 1 è principale
        if (lottiProp1Dollari > 0) {
          if (direzioneReal === 'BUY') {
            stopLossPrincipale = prezzoIngresso - Math.abs(Math.round(sl1)) / (lottiProp1Dollari * moltiplicatore);
            takeProfitPrincipale = prezzoIngresso + Math.abs(Math.round(tp1)) / (lottiProp1Dollari * moltiplicatore);
          } else { // SELL
            stopLossPrincipale = prezzoIngresso + Math.abs(Math.round(sl1)) / (lottiProp1Dollari * moltiplicatore);
            takeProfitPrincipale = prezzoIngresso - Math.abs(Math.round(tp1)) / (lottiProp1Dollari * moltiplicatore);
          }
          setStopLossPrezzoProp1(Math.round(stopLossPrincipale * 100) / 100);
          setTakeProfitPrezzoProp1(Math.round(takeProfitPrincipale * 100) / 100);
        } else {
          setStopLossPrezzoProp1(0);
          setTakeProfitPrezzoProp1(0);
          stopLossPrincipale = 0;
          takeProfitPrincipale = 0;
        }
        
        // Prop 2 è secondaria - calcola basandosi sui prezzi della prop principale
        if (stopLossPrincipale && takeProfitPrincipale) {
          let stopLossSecondaria, takeProfitSecondaria;
          
          // Calcola offset basato sugli spread oro delle due prop
          const spreadOro1 = SPREAD_CONSTANTS[prop1]?.oro || 0;
          const spreadOro2 = SPREAD_CONSTANTS[prop2]?.oro || 0;
          const offset = (spreadOro1 + spreadOro2) / 200;
          
          if (direzioneReal === 'BUY') {
            stopLossSecondaria = takeProfitPrincipale + offset;
            takeProfitSecondaria = stopLossPrincipale + offset;
          } else { // SELL
            stopLossSecondaria = takeProfitPrincipale - offset;
            takeProfitSecondaria = stopLossPrincipale - offset;
          }
          
          setStopLossPrezzoProp2(Math.round(stopLossSecondaria * 100) / 100);
          setTakeProfitPrezzoProp2(Math.round(takeProfitSecondaria * 100) / 100);
        } else {
          setStopLossPrezzoProp2(0);
          setTakeProfitPrezzoProp2(0);
        }
        
      } else {
        // Prop 2 è principale
        if (lottiProp2Dollari > 0) {
          if (direzioneReal === 'BUY') {
            stopLossPrincipale = prezzoIngresso - Math.abs(Math.round(sl2)) / (lottiProp2Dollari * moltiplicatore);
            takeProfitPrincipale = prezzoIngresso + Math.abs(Math.round(tp2)) / (lottiProp2Dollari * moltiplicatore);
          } else { // SELL
            stopLossPrincipale = prezzoIngresso + Math.abs(Math.round(sl2)) / (lottiProp2Dollari * moltiplicatore);
            takeProfitPrincipale = prezzoIngresso - Math.abs(Math.round(tp2)) / (lottiProp2Dollari * moltiplicatore);
          }
          setStopLossPrezzoProp2(Math.round(stopLossPrincipale * 100) / 100);
          setTakeProfitPrezzoProp2(Math.round(takeProfitPrincipale * 100) / 100);
        } else {
          setStopLossPrezzoProp2(0);
          setTakeProfitPrezzoProp2(0);
          stopLossPrincipale = 0;
          takeProfitPrincipale = 0;
        }
        
        // Prop 1 è secondaria - calcola basandosi sui prezzi della prop principale
        if (stopLossPrincipale && takeProfitPrincipale) {
          let stopLossSecondaria, takeProfitSecondaria;
          
          // Calcola offset basato sugli spread oro delle due prop
          const spreadOro1 = SPREAD_CONSTANTS[prop1]?.oro || 0;
          const spreadOro2 = SPREAD_CONSTANTS[prop2]?.oro || 0;
          const offset = (spreadOro1 + spreadOro2) / 200;
          
          if (direzioneReal === 'BUY') {
            stopLossSecondaria = takeProfitPrincipale + offset;
            takeProfitSecondaria = stopLossPrincipale + offset;
          } else { // SELL
            stopLossSecondaria = takeProfitPrincipale - offset;
            takeProfitSecondaria = stopLossPrincipale - offset;
          }
          
          setStopLossPrezzoProp1(Math.round(stopLossSecondaria * 100) / 100);
          setTakeProfitPrezzoProp1(Math.round(takeProfitSecondaria * 100) / 100);
        } else {
          setStopLossPrezzoProp1(0);
          setTakeProfitPrezzoProp1(0);
        }
      }
      
    } else {
      // Reset prezzi se non c'è prezzo di ingresso
      setStopLossPrezzoProp1(0);
      setTakeProfitPrezzoProp1(0);
      setStopLossPrezzoProp2(0);
      setTakeProfitPrezzoProp2(0);
    }

  }, [prop1, prop2, capitale1, capitale2, livelloUtente, currentSheet, prezzoIngressoReal, direzioneReal]);

  // Handlers
  const handleLogin = () => {
    if (DEFAULT_CREDENTIALS[username] && DEFAULT_CREDENTIALS[username] === password) {
      setIsLoggedIn(true);
      setShowWelcome(true); // Mostra pagina intermedia
      setShowLoginError(false);
      const permissions = USER_LEVEL_PERMISSIONS[username] || [];
      setUserPermissions(permissions);
      // Imposta automaticamente il livello più alto disponibile
      if (permissions.length > 0) {
        const maxLevel = Math.max(...permissions);
        setLivelloUtente(maxLevel);
      }
    } else {
      setShowLoginError(true);
      setTimeout(() => setShowLoginError(false), 3000);
    }
  };

  const handleReset = () => {
    const capitali = currentSheet === 'The5ers' 
      ? [5000, 10000, 20000, 60000, 100000]
      : getCapitalTiers(currentSheet);
    const capitale = capitali[livelloUtente - 1];
    setCapitaleFungina(capitale);
    setCapitaleSuProp(capitale);
    setFase(1);
    setOperazione(1);
    setProfittoOggi(0);
    setPrezzoApprox(5000);
    setPrezzoIngresso('');
    setTipoOperazione('BUY');
    setHasTakeProfit(false);
    setFundingTradersPair('XAUUSD'); // Reset della coppia per FundingTraders
    setFundingTradersPercentage('50'); // Reset della percentuale per FundingTraders
  };

  const getSheetTitle = () => {
    const livelli = ['$500', '$1000', '$2500', '$5000', '$10000'];
    return `${currentSheet} Calculator ${livelli[livelloUtente - 1]}`;
  };

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 rounded-t-xl">
            <h2 className="text-2xl font-bold text-white text-center">Lot Size Calculator</h2>
          </div>
          <div className="p-8 space-y-6">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Username"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700"
            >
              Accedi
            </button>
          </div>
        </div>
        
        {/* Footer Disclaimer */}
        <div className="mt-4 w-full max-w-md px-4">
          <p className="text-white/60 text-[9px] leading-tight text-center">
            This tool is a mathematical calculation utility. It does not provide financial, investment, trading, or risk management advice. All results are generated solely from user-defined inputs. The developer assumes no liability for any financial losses resulting from the use of this tool.
          </p>
        </div>
        
        {showLoginError && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50">
            Username o password errati
          </div>
        )}
      </div>
    );
  }

  // Pagina intermedia di benvenuto
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-8 py-4 sm:py-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1"></div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white text-center flex-1">Benvenuto!</h2>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => setShowCalcolatorePopup(true)}
                  className="bg-white/20 hover:bg-white/30 transition-all duration-200 rounded-lg p-2 sm:p-3 backdrop-blur-sm"
                  title="Apri Calcolatore"
                >
                  <div className="grid grid-cols-2 gap-0.5 text-white font-bold text-base sm:text-lg">
                    <span>+</span>
                    <span>−</span>
                    <span>×</span>
                    <span>÷</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-2 sm:p-8">
            <div className="bg-gray-50 rounded-lg p-2 sm:p-8 mb-4 sm:mb-10">
              <h4 className="font-bold text-gray-800 mb-3 sm:mb-6 flex items-center justify-center text-base sm:text-lg">
                Seleziona il tuo livello:
              </h4>
              <div className="flex flex-wrap justify-center gap-4">
                {userPermissions.map(level => {
                  const levelNames = ['$500', '$1000', '$2500', '$5000', '$10000'];
                  return (
                    <button
                      key={level}
                      onClick={() => setLivelloUtente(level)}
                      className={`px-8 py-4 rounded-full text-base font-semibold transition-all duration-200 ${
                        livelloUtente === level
                          ? 'bg-blue-500 text-white shadow-xl transform scale-110'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-lg'
                      }`}
                    >
                      {levelNames[level - 1]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
              {['FundedNext', 'OneFunded', 'MasterFunders', 'FundingPips', 'The5ers', 'Fintokei', 'Audacity Capital', 'FundingTraders']
                .filter(sheet => sheet !== 'Fintokei' || livelloUtente >= 3) // Nascondi Fintokei se livello < 3
                .filter(sheet => sheet !== 'FundingTraders' || livelloUtente >= 3) // Nascondi FundingTraders se livello < 3
                .map((sheet) => {
                const isMasterFundersDisabled = sheet === 'MasterFunders' && username !== 'GCos'; // Disponibile solo per GCos
                const isDisabled = isMasterFundersDisabled;
                
                return (
                  <button
                    key={sheet}
                    onClick={() => {
                      if (!isDisabled) {
                        setCurrentSheet(sheet);
                        setShowWelcome(false);
                        handleReset();
                      }
                    }}
                    disabled={isDisabled}
                    className={`bg-gradient-to-br from-white via-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-8 sm:p-6 shadow-lg shadow-blue-100/50 text-center group relative overflow-hidden backdrop-blur-sm min-h-[80px] sm:min-h-auto ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {/* Bordo interno luminoso */}
                    <div className="absolute inset-1 rounded-xl border border-blue-50/60"></div>
                    
                    {/* Pattern decorativo sottile */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/20 to-transparent opacity-50"></div>
                    
                    <h4 className="font-bold text-blue-700 text-xs relative z-10 drop-shadow-sm">
                      {sheet}
                      {isMasterFundersDisabled && <span className="block text-[10px] mt-1 text-red-600">Disabilitato</span>}
                    </h4>
                  </button>
                );
              })}
            </div>
            
            {/* Fase Real - Casella separata a tutta larghezza */}
            <div className="w-full">
              <button
                onClick={() => {
                  setCurrentSheet('Fase Real');
                  setShowWelcome(false);
                  handleReset();
                }}
                className="w-full bg-gradient-to-br from-white via-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-8 sm:p-6 shadow-lg shadow-blue-100/50 text-center group relative overflow-hidden backdrop-blur-sm min-h-[80px] sm:min-h-auto"
              >
                {/* Bordo interno luminoso */}
                <div className="absolute inset-1 rounded-xl border border-blue-50/60"></div>
                
                {/* Pattern decorativo sottile */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/20 to-transparent opacity-50"></div>
                
                <h4 className="font-bold text-blue-700 text-xs relative z-10 drop-shadow-sm">
                  Fase Real
                </h4>
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer Disclaimer */}
        <div className="mt-4 w-full max-w-4xl px-4">
          <p className="text-gray-500 text-[9px] leading-tight text-center">
            This tool is a mathematical calculation utility. It does not provide financial, investment, trading, or risk management advice. All results are generated solely from user-defined inputs. The developer assumes no liability for any financial losses resulting from the use of this tool.
          </p>
        </div>
        
        {/* Popup Calcolatore */}
        {showCalcolatorePopup && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
            onClick={() => setShowCalcolatorePopup(false)}
          >
            <div 
              className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Popup */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 sm:px-6 sm:py-4 rounded-t-lg sm:rounded-t-xl flex items-center justify-between sticky top-0 z-10">
                <h3 className="text-lg sm:text-2xl font-bold text-white">Calcolatore</h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Dropdown Prop */}
                  <select
                    value={propCalcolatore}
                    onChange={(e) => setPropCalcolatore(e.target.value)}
                    className="px-2 py-1 sm:px-3 sm:py-1.5 border-0 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-white/50 focus:outline-none"
                  >
                    <option value="fundednext" className="text-gray-900">Funded Next</option>
                    <option value="onefunded" className="text-gray-900">One Funded</option>
                    <option value="fundingpips" className="text-gray-900">Funding Pips</option>
                    <option value="the5ers" className="text-gray-900">The5ers</option>
                    <option value="fintokei" className="text-gray-900">Fintokei</option>
                    <option value="dragon" className="text-gray-900">Audacity Capital</option>
                  </select>
                  
                  {/* Pulsante Chiudi */}
                  <button
                    onClick={() => setShowCalcolatorePopup(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-all duration-200"
                    title="Chiudi"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Contenuto Popup */}
              <div className="p-3 sm:p-6">
                {/* Input Fields Grid 2x2 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
                  {/* Prima riga: Capitale e Prezzo EURUSD */}
                  
                  {/* Campo Capitale */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Capitale ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={capitaleCalc}
                      onChange={(e) => setCapitaleCalc(e.target.value)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                      placeholder="Capitale"
                    />
                  </div>

                  {/* Campo Prezzo EURUSD */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Prezzo EURUSD
                    </label>
                    <input
                      type="number"
                      step="0.00001"
                      value={prezzoEurusdCalc}
                      onChange={(e) => setPrezzoEurusdCalc(e.target.value)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                      placeholder="1.10000"
                    />
                  </div>

                  {/* Seconda riga: Perdita e Profitto Desiderati */}

                  {/* Campo Perdita Desiderata */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Perdita ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={perditaDesiderata}
                      onChange={(e) => setPerditaDesiderata(e.target.value)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                      placeholder="Perdita"
                    />
                  </div>

                  {/* Campo Profitto Desiderato */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Profitto ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={profittoDesiderato}
                      onChange={(e) => setProfittoDesiderato(e.target.value)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                      placeholder="Profitto"
                    />
                  </div>
                </div>

                {/* Lotti Result Boxes 2x1 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-4">
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-blue-500">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">LOTTI PROP</div>
                    <div className="text-base sm:text-xl font-bold text-blue-700">{lottiPropCalc}</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-indigo-500">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">LOTTI BROKER</div>
                    <div className="text-base sm:text-xl font-bold text-indigo-700">{lottiBrokerCalc}</div>
                  </div>
                </div>

                {/* Prezzo Ingresso e Direzione 2x1 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
                  {/* Campo Prezzo Ingresso Prop */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Prezzo Ingresso
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={prezzoIngressoPropCalc}
                      onChange={(e) => setPrezzoIngressoPropCalc(e.target.value)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                      placeholder="Prezzo"
                    />
                  </div>

                  {/* Campo Direzione */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      Direzione
                    </label>
                    <select
                      value={direzioneCalc}
                      onChange={(e) => setDirezioneCalc(e.target.value)}
                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                    >
                      <option value="BUY">Buy</option>
                      <option value="SELL">Sell</option>
                    </select>
                  </div>
                </div>

                {/* Take Profit e Stop Loss Result Boxes 2x2 */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {/* Riga 1: Take Profit */}
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-green-500">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">TAKE PROFIT PROP</div>
                    <div className="text-sm sm:text-xl font-bold text-green-700">{takeProfitPropCalc.toFixed(5)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-green-400">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">TAKE PROFIT BROKER</div>
                    <div className="text-sm sm:text-xl font-bold text-green-600">{takeProfitBrokerCalc.toFixed(5)}</div>
                  </div>

                  {/* Riga 2: Stop Loss */}
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-red-500">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">STOP LOSS PROP</div>
                    <div className="text-sm sm:text-xl font-bold text-red-700">{stopLossPropCalc.toFixed(5)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-red-400">
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">STOP LOSS BROKER</div>
                    <div className="text-sm sm:text-xl font-bold text-red-600">{stopLossBrokerCalc.toFixed(5)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Popup Calcolatore */}
      {showCalcolatorePopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
          onClick={() => setShowCalcolatorePopup(false)}
        >
          <div 
            className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Popup */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 sm:px-6 sm:py-4 rounded-t-lg sm:rounded-t-xl flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-lg sm:text-2xl font-bold text-white">Calcolatore</h3>
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Dropdown Prop */}
                <select
                  value={propCalcolatore}
                  onChange={(e) => setPropCalcolatore(e.target.value)}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 border-0 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-white/50 focus:outline-none"
                >
                  <option value="fundednext" className="text-gray-900">Funded Next</option>
                  <option value="onefunded" className="text-gray-900">One Funded</option>
                  <option value="fundingpips" className="text-gray-900">Funding Pips</option>
                  <option value="the5ers" className="text-gray-900">The5ers</option>
                  <option value="fintokei" className="text-gray-900">Fintokei</option>
                  <option value="dragon" className="text-gray-900">Audacity Capital</option>
                </select>
                
                {/* Pulsante Chiudi */}
                <button
                  onClick={() => setShowCalcolatorePopup(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-all duration-200"
                  title="Chiudi"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Contenuto Popup */}
            <div className="p-3 sm:p-6">
              {/* Input Fields Grid 2x2 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
                {/* Prima riga: Capitale e Prezzo EURUSD */}
                
                {/* Campo Capitale */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Capitale ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={capitaleCalc}
                    onChange={(e) => setCapitaleCalc(e.target.value)}
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                    placeholder="Capitale"
                  />
                </div>

                {/* Campo Prezzo EURUSD */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Prezzo EURUSD
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={prezzoEurusdCalc}
                    onChange={(e) => setPrezzoEurusdCalc(e.target.value)}
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                    placeholder="1.10000"
                  />
                </div>

                {/* Seconda riga: Perdita e Profitto Desiderati */}

                {/* Campo Perdita Desiderata */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Perdita ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={perditaDesiderata}
                    onChange={(e) => setPerditaDesiderata(e.target.value)}
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                    placeholder="Perdita"
                  />
                </div>

                {/* Campo Profitto Desiderato */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Profitto ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={profittoDesiderato}
                    onChange={(e) => setProfittoDesiderato(e.target.value)}
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                    placeholder="Profitto"
                  />
                </div>
              </div>

              {/* Lotti Result Boxes 2x1 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-4">
                <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-blue-500">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">LOTTI PROP</div>
                  <div className="text-base sm:text-xl font-bold text-blue-700">{lottiPropCalc}</div>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-indigo-500">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">LOTTI BROKER</div>
                  <div className="text-base sm:text-xl font-bold text-indigo-700">{lottiBrokerCalc}</div>
                </div>
              </div>

              {/* Prezzo Ingresso e Direzione 2x1 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
                {/* Campo Prezzo Ingresso Prop */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Prezzo Ingresso
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={prezzoIngressoPropCalc}
                    onChange={(e) => setPrezzoIngressoPropCalc(e.target.value)}
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                    placeholder="Prezzo"
                  />
                </div>

                {/* Campo Direzione */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Direzione
                  </label>
                  <select
                    value={direzioneCalc}
                    onChange={(e) => setDirezioneCalc(e.target.value)}
                    className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm sm:text-base font-medium"
                  >
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                  </select>
                </div>
              </div>

              {/* Take Profit e Stop Loss Result Boxes 2x2 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Riga 1: Take Profit */}
                <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-green-500">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">TAKE PROFIT PROP</div>
                  <div className="text-sm sm:text-xl font-bold text-green-700">{takeProfitPropCalc.toFixed(5)}</div>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-green-400">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">TAKE PROFIT BROKER</div>
                  <div className="text-sm sm:text-xl font-bold text-green-600">{takeProfitBrokerCalc.toFixed(5)}</div>
                </div>

                {/* Riga 2: Stop Loss */}
                <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-red-500">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">STOP LOSS PROP</div>
                  <div className="text-sm sm:text-xl font-bold text-red-700">{stopLossPropCalc.toFixed(5)}</div>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-3 text-center border-l-4 border-red-400">
                  <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">STOP LOSS BROKER</div>
                  <div className="text-sm sm:text-xl font-bold text-red-600">{stopLossBrokerCalc.toFixed(5)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => {
                    setShowWelcome(true);
                    handleReset();
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex-shrink-0"
                  title="Torna alla selezione"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{getSheetTitle()}</h1>
                
                {/* Dropdown percentuale per FundingTraders */}
                {currentSheet === 'FundingTraders' && livelloUtente >= 3 && (
                  <select
                    value={fundingTradersPercentage}
                    onChange={(e) => setFundingTradersPercentage(e.target.value)}
                    className="px-2 sm:px-3 py-1 rounded-lg bg-white bg-opacity-20 backdrop-blur-sm text-white font-medium text-xs sm:text-sm border-0 focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  >
                    {livelloUtente >= 4 && <option value="20" className="text-gray-900">20%</option>}
                    <option value="30" className="text-gray-900">30%</option>
                    <option value="40" className="text-gray-900">40%</option>
                    <option value="50" className="text-gray-900">50%</option>
                  </select>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={livelloUtente}
                  onChange={(e) => setLivelloUtente(Number(e.target.value))}
                  className="px-2 sm:px-3 py-1 rounded-lg bg-white text-blue-700 font-medium text-xs sm:text-sm border-0 focus:ring-2 focus:ring-blue-200"
                >
                  {userPermissions.includes(1) && <option value={1}>$500</option>}
                  {userPermissions.includes(2) && <option value={2}>$1000</option>}
                  {userPermissions.includes(3) && <option value={3}>$2500</option>}
                  {userPermissions.includes(4) && <option value={4}>$5000</option>}
                  {userPermissions.includes(5) && <option value={5}>$10000</option>}
                </select>
                {currentSheet !== 'Fase Real' && (
                  <button 
                    onClick={() => {
                      if (currentSheet === 'FundedNext' || currentSheet === 'OneFunded' || currentSheet === 'MasterFunders' || currentSheet === 'FundingTraders' || currentSheet === 'FundingPips' || currentSheet === 'The5ers' || currentSheet === 'Fintokei' || currentSheet === 'Audacity Capital') {
                        setShowInfoPopup(true);
                      }
                    }}
                    className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-base ${
                      (currentSheet === 'FundedNext' || currentSheet === 'OneFunded' || currentSheet === 'MasterFunders' || currentSheet === 'FundingTraders' || currentSheet === 'FundingPips' || currentSheet === 'The5ers' || currentSheet === 'Fintokei' || currentSheet === 'Audacity Capital')
                        ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white cursor-pointer' 
                        : 'bg-gray-400 bg-opacity-50 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    Info
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Paragrafo speciale per MasterFunders */}
            {currentSheet === 'MasterFunders' && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 mb-6 border border-orange-200 shadow-sm">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-700 mb-2">
                    {(operazione === 1 || capitaleSuProp >= getCapitalTiers(currentSheet)[livelloUtente - 1]) ? 'XAUUSD' : 'EURUSD'}
                  </div>
                  <div className="text-sm text-orange-600 font-medium">
                    {(operazione === 1 || capitaleSuProp >= getCapitalTiers(currentSheet)[livelloUtente - 1]) ? 'Gold Trading' : 'EUR/USD Trading'}
                  </div>
                </div>
              </div>
            )}

            {/* Paragrafo speciale per FundingTraders */}
            {currentSheet === 'FundingTraders' && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 mb-6 border border-orange-200 shadow-sm">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-700 mb-2">
                    {operazione === 2 ? 'EURUSD' : 'XAUUSD'}
                  </div>
                  <div className="text-sm text-orange-600 font-medium">
                    {operazione === 2 ? 'EUR/USD Trading' : 'Gold Trading'}
                  </div>
                </div>
              </div>
            )}

            {/* Paragrafo speciale per The5ers livelli 4 e 5 con hasTakeProfit */}
            {currentSheet === 'The5ers' && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5) && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 mb-6 border border-orange-200 shadow-sm">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-700 mb-2">
                    {operazione === 2 ? 'EURUSD' : 'XAUUSD'}
                  </div>
                  <div className="text-sm text-orange-600 font-medium">
                    {operazione === 2 ? 'EUR/USD Trading' : 'Gold Trading'}
                  </div>
                </div>
              </div>
            )}

            {/* Main Calculator per FundedNext, OneFunded, FundingPips, FundingTraders, MasterFunders, Fintokei, The5ers e Dragon */}
            {(currentSheet === 'FundedNext' || currentSheet === 'OneFunded' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders' || currentSheet === 'MasterFunders' || currentSheet === 'Fintokei' || currentSheet === 'The5ers' || currentSheet === 'Audacity Capital') ? (
              <>
                {/* Controlli */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fase</label>
                    <select value={fase} onChange={(e) => {
                      setFase(Number(e.target.value));
                      // Reset completo dei valori quando cambia la fase
                      const capitali = currentSheet === 'The5ers' 
                        ? [5000, 10000, 20000, 60000, 100000]
                        : currentSheet === 'Fintokei'
                        ? [5000, 10000, 20000, 50000, 100000]
                        : getCapitalTiers(currentSheet);
                      const capitale = capitali[livelloUtente - 1];
                      setCapitaleSuProp(capitale);
                      setOperazione(1);
                      setProfittoOggi(0);
                      setTempProfitto(0);
                      setPrezzoIngresso(''); // Reset anche prezzo ingresso
                      setRisultatoSelezionato('');
                      setProfittoRisultato('');
                      setCapitalePropRisultato('');
                      setHasTakeProfit(false); // Reset take profit per The5ers
                    }} className="w-full px-2 py-1 text-sm border rounded">
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Operazione</label>
                    <select 
                      value={operazione} 
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value={1}>Prima</option>
                      <option value={2}>Successiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cap. Prop $</label>
                    <input type="number" value={capitaleSuProp} onChange={(e) => setCapitaleSuProp(Number(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prezzo Approx</label>
                    <input type="number" step="0.1" value={prezzoApprox} onChange={(e) => setPrezzoApprox(Number(e.target.value))} className="w-full px-2 py-1 text-sm border rounded" />
                  </div>
                  {operazione === 2 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Profitto $</label>
                      <input type="number" value={profittoOggi} className="w-full px-2 py-1 text-sm border rounded bg-green-50" readOnly />
                    </div>
                  )}
                </div>

                {/* Parametro aggiuntivo per The5ers, Fintokei, FundingPips e FundingTraders */}
                {(currentSheet === 'The5ers' || currentSheet === 'Fintokei' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders') && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                    <div className="max-w-xs">
                      <label className="block text-sm font-semibold text-blue-800 mb-2">
                        {(currentSheet === 'FundingPips' || currentSheet === 'Fintokei' || currentSheet === 'FundingTraders') ? 'Primo giorno completato?' : 'Hai già preso 2 take profit?'}
                      </label>
                      <select 
                        value={hasTakeProfit ? 'Si' : 'No'} 
                        onChange={(e) => {
                          const newValue = e.target.value === 'Si';
                          setHasTakeProfit(newValue);
                          // Se cambia da "Si" a "No", forza operazione a "Prima"
                          if (!newValue && operazione === 2) {
                            setOperazione(1);
                            setProfittoOggi(0);
                          }
                        }} 
                        className="w-full px-3 py-2 text-sm border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium"
                      >
                        <option value="No">No</option>
                        <option value="Si">Si</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Lotti */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Parametri Lotti</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center border-l-4 border-blue-500">
                      <div className="text-xs text-gray-500 mb-1">LOTTI PROP</div>
                      <div className="text-2xl font-bold text-blue-700">{risultati.lottiProp}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border-l-4 border-indigo-500">
                      <div className="text-xs text-gray-500 mb-1">LOTTI BROKER</div>
                      <div className="text-2xl font-bold text-indigo-700">{risultati.lottiAxi}</div>
                    </div>
                  </div>
                </div>

                {/* Parametri Operazioni */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 mb-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Parametri Operazione Prop</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Prezzo Ingresso
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={prezzoIngresso || ''} 
                        onChange={(e) => setPrezzoIngresso(e.target.value === '' ? '' : Number(e.target.value))} 
                        className="w-full px-3 py-2 text-lg font-semibold border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" 
                      />
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Direzione
                      </label>
                      <select 
                        value={tipoOperazione} 
                        onChange={(e) => setTipoOperazione(e.target.value)} 
                        className="w-full px-3 py-2 text-lg font-semibold border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                      >
                        <option value="BUY">BUY</option>
                        <option value="SELL">SELL</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Take Profit & Stop Loss */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Take Profit & Stop Loss</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center border-l-4 border-green-500">
                      <div className="text-xs text-gray-500 mb-1">TAKE PROFIT PROP</div>
                      <div className="text-lg font-bold text-green-600">{risultati.stopLossPrezzo}</div>
                      <div className="text-xs text-gray-500">{risultati.stopLossPips} $</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border-l-4 border-green-400">
                      <div className="text-xs text-gray-500 mb-1">TAKE PROFIT BROKER</div>
                      <div className="text-lg font-bold text-green-600">{risultati.stopLossAxiPrezzo}</div>
                      <div className="text-xs text-gray-500">{(risultati.takeProfitPips * risultati.l8_base_current - (risultati.lottiAxi * ((currentSheet === 'MasterFunders' && operazione === 2) || (currentSheet === 'The5ers' && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5)) ? 10 : 40))).toFixed(2)} $</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border-l-4 border-red-500">
                      <div className="text-xs text-gray-500 mb-1">STOP LOSS PROP</div>
                      <div className="text-lg font-bold text-red-600">{risultati.takeProfitPrezzo}</div>
                      <div className="text-xs text-gray-500">-{risultati.takeProfitPips} $</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center border-l-4 border-red-400">
                      <div className="text-xs text-gray-500 mb-1">STOP LOSS BROKER</div>
                      <div className="text-lg font-bold text-red-600">{risultati.takeProfitAxiPrezzo}</div>
                      <div className="text-xs text-gray-500">-{(risultati.stopLossPips * risultati.l8_base_current + (risultati.lottiAxi * ((currentSheet === 'MasterFunders' && operazione === 2) || (currentSheet === 'The5ers' && operazione === 2 && hasTakeProfit && (livelloUtente === 4 || livelloUtente === 5)) ? 10 : 40))).toFixed(2)} $</div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-center gap-4">
                  <button onClick={() => {
                    setRisultatoSelezionato(''); // Reset per mostrare sempre il popup di selezione
                    setShowRisultatiPopup(true);
                  }} className="bg-green-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-600">
                    Risultati
                  </button>
                  <button onClick={handleReset} className="bg-orange-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-600">
                    Reset
                  </button>
                </div>
              </>
            ) : currentSheet === 'Fase Real' ? (
              <>
                {/* Due riquadri con VS in mezzo */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-6">
                  {/* Riquadro Sinistro */}
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200 shadow-sm w-full sm:flex-1 max-w-xs">
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">Prop 1</h3>
                      <select 
                        value={prop1} 
                        onChange={(e) => setProp1(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium text-sm sm:text-base"
                      >
                        <option value="">Seleziona...</option>
                        <option value="masterfunders" disabled={prop2 === 'masterfunders'}>Master Funders</option>
                        {livelloUtente >= 3 && <option value="fintokei" disabled={prop2 === 'fintokei'}>Fintokei</option>}
                        <option value="fundednext" disabled={prop2 === 'fundednext'}>Funded Next</option>
                        <option value="onefunded" disabled={prop2 === 'onefunded'}>One Funded</option>
                        <option value="fundingpips" disabled={prop2 === 'fundingpips'}>Funding Pips</option>
                        {livelloUtente >= 3 && <option value="fundingtraders" disabled={prop2 === 'fundingtraders'}>Funding Traders</option>}
                        <option value="the5ers" disabled={prop2 === 'the5ers'}>The5ers</option>
                        <option value="dragon" disabled={prop2 === 'dragon'}>Audacity Capital</option>
                      </select>
                    </div>
                  </div>

                  {/* VS in mezzo */}
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600 px-4">
                    VS
                  </div>

                  {/* Riquadro Destro */}
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200 shadow-sm w-full sm:flex-1 max-w-xs">
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">Prop 2</h3>
                      <select 
                        value={prop2} 
                        onChange={(e) => setProp2(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium text-sm sm:text-base"
                      >
                        <option value="">Seleziona...</option>
                        <option value="masterfunders" disabled={prop1 === 'masterfunders'}>Master Funders</option>
                        {livelloUtente >= 3 && <option value="fintokei" disabled={prop1 === 'fintokei'}>Fintokei</option>}
                        <option value="fundednext" disabled={prop1 === 'fundednext'}>Funded Next</option>
                        <option value="onefunded" disabled={prop1 === 'onefunded'}>One Funded</option>
                        <option value="fundingpips" disabled={prop1 === 'fundingpips'}>Funding Pips</option>
                        {livelloUtente >= 3 && <option value="fundingtraders" disabled={prop1 === 'fundingtraders'}>Funding Traders</option>}
                        <option value="the5ers" disabled={prop1 === 'the5ers'}>The5ers</option>
                        <option value="dragon" disabled={prop1 === 'dragon'}>Audacity Capital</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sezione Capitali */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-6">
                  {/* Capitale Prop 1 */}
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200 shadow-sm w-full sm:flex-1 max-w-xs">
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">Capitale Prop 1</h3>
                      <input
                        type="number"
                        value={capitale1}
                        onChange={(e) => setCapitale1(e.target.value)}
                        placeholder="Inserisci capitale..."
                        className="w-full px-3 sm:px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium text-center text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Spazio vuoto */}
                  <div className="text-3xl sm:text-4xl font-bold text-transparent px-4">
                    &nbsp;
                  </div>

                  {/* Capitale Prop 2 */}
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200 shadow-sm w-full sm:flex-1 max-w-xs">
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">Capitale Prop 2</h3>
                      <input
                        type="number"
                        value={capitale2}
                        onChange={(e) => setCapitale2(e.target.value)}
                        placeholder="Inserisci capitale..."
                        className="w-full px-3 sm:px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium text-center text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Sezione Lotti */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-6">
                  {/* Lotti Prop 1 */}
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200 shadow-sm w-full sm:flex-1 max-w-xs">
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">Lotti Prop 1</h3>
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {lottiProp1Dollari}
                      </div>
                    </div>
                  </div>

                  {/* Spazio vuoto */}
                  <div className="text-3xl sm:text-4xl font-bold text-transparent px-4">
                    &nbsp;
                  </div>

                  {/* Lotti Prop 2 */}
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200 shadow-sm w-full sm:flex-1 max-w-xs">
                    <div className="text-center">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 sm:mb-4">Lotti Prop 2</h3>
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {lottiProp2Dollari}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sezione Prezzo Ingresso e Direzione */}
                <div className="flex justify-center mb-6">
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm w-full max-w-4xl">
                    <div className="flex flex-col lg:flex-row items-center gap-4 mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-700">Parametri Operazione</h3>
                      
                      {/* Prop Principale */}
                      {(prop1 && prop2) && (
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                          {(() => {
                            // Determina prop principale
                            let propPrincipale = '';
                            if (prop1 === 'masterfunders' || prop2 === 'masterfunders') {
                              propPrincipale = prop1 === 'masterfunders' ? prop1 : prop2;
                            } else {
                              const cap1 = Number(capitale1) || 0;
                              const cap2 = Number(capitale2) || 0;
                              if (cap1 <= cap2) {
                                propPrincipale = prop1;
                              } else if (cap2 < cap1) {
                                propPrincipale = prop2;
                              } else {
                                propPrincipale = prop1; // Se uguali, prop1
                              }
                            }
                            
                            // Mappa nome per visualizzazione
                            const nomiProp = {
                              'masterfunders': 'Master Funders',
                              'fintokei': 'Fintokei',
                              'fundednext': 'Funded Next',
                              'onefunded': 'One Funded',
                              'fundingpips': 'Funding Pips',
                              'fundingtraders': 'Funding Traders',
                              'the5ers': 'The5ers',
                              'dragon': 'Audacity Capital'
                            };
                            
                            return nomiProp[propPrincipale] || '';
                          })()}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                          Prezzo Ingresso
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={prezzoIngressoReal}
                          onChange={(e) => setPrezzoIngressoReal(e.target.value)}
                          placeholder="Inserisci prezzo..."
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium text-center text-base sm:text-lg"
                        />
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                          Direzione
                        </label>
                        <select 
                          value={direzioneReal} 
                          onChange={(e) => setDirezioneReal(e.target.value)} 
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium text-center text-base sm:text-lg"
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sezione Stop Loss e Take Profit unificata */}
                <div className="bg-blue-50/50 rounded-lg p-4 sm:p-6 border border-blue-100 shadow-sm mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-blue-900 text-center mb-4 sm:mb-6">Take Profit & Stop Loss</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Stop Loss Prop 1 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                      <h4 className="text-sm sm:text-base font-medium text-gray-600 mb-2 text-center">
                        Stop Loss Prop 1
                      </h4>
                      <div className="text-lg sm:text-xl font-bold text-red-600 text-center">
                        {stopLossPrezzoProp1 || '0.00'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 text-center mt-1">
                        -{stopLossProp1Dollari} $
                      </div>
                    </div>

                    {/* Stop Loss Prop 2 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                      <h4 className="text-sm sm:text-base font-medium text-gray-600 mb-2 text-center">
                        Stop Loss Prop 2
                      </h4>
                      <div className="text-lg sm:text-xl font-bold text-red-600 text-center">
                        {stopLossPrezzoProp2 || '0.00'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 text-center mt-1">
                        -{stopLossProp2Dollari} $
                      </div>
                    </div>

                    {/* Take Profit Prop 1 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                      <h4 className="text-sm sm:text-base font-medium text-gray-600 mb-2 text-center">
                        Take Profit Prop 1
                      </h4>
                      <div className="text-lg sm:text-xl font-bold text-green-600 text-center">
                        {takeProfitPrezzoProp1 || '0.00'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 text-center mt-1">
                        {takeProfitProp1Dollari} $
                      </div>
                    </div>

                    {/* Take Profit Prop 2 */}
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-100">
                      <h4 className="text-sm sm:text-base font-medium text-gray-600 mb-2 text-center">
                        Take Profit Prop 2
                      </h4>
                      <div className="text-lg sm:text-xl font-bold text-green-600 text-center">
                        {takeProfitPrezzoProp2 || '0.00'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 text-center mt-1">
                        {takeProfitProp2Dollari} $
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="text-6xl mb-4">🚧</div>
                  <h3 className="text-xl font-semibold mb-2">{getSheetTitle()}</h3>
                  <p className="text-gray-600">Questa sezione è in fase di sviluppo</p>
                </div>
              </div>
            )}
          </div>

          {/* Popup Profitto */}
          {showProfittoPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm mx-auto">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Inserisci Profitto</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Inserisci il profitto di oggi:</p>
                <input
                  type="number"
                  value={tempProfitto || ''}
                  onChange={(e) => setTempProfitto(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md mb-3 sm:mb-4 text-sm sm:text-base"
                  autoFocus
                />
                <div className="flex gap-2 sm:gap-3">
                  <button onClick={() => {setProfittoOggi(tempProfitto); setShowProfittoPopup(false);}} className="flex-1 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base">
                    Conferma
                  </button>
                  <button onClick={() => {setOperazione(1); setProfittoOggi(0); setShowProfittoPopup(false);}} className="flex-1 bg-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base">
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Popup Risultati */}
          {showRisultatiPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Inserisci qui solo i risultati ottenuti sulla prop</h3>
                
                {/* Per OneFunded, mostra direttamente i campi input */}
                {currentSheet === 'OneFunded' ? (
                  <div className="space-y-3 sm:space-y-4">
                    <input
                      type="number"
                      value={profittoRisultato || ''}
                      onChange={(e) => setProfittoRisultato(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                      placeholder="Profitto..."
                    />
                    <input
                      type="number"
                      value={capitalePropRisultato || ''}
                      onChange={(e) => setCapitalePropRisultato(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                      placeholder="Capitale prop..."
                    />
                  </div>
                ) : (currentSheet === 'Fintokei' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders') && !hasTakeProfit ? (
                  <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                    <p className="text-base sm:text-lg font-semibold mb-2">Ben fatto!</p>
                    <p className="text-sm sm:text-base text-gray-600">Ci vediamo domani.</p>
                  </div>
                ) : (currentSheet === 'Fintokei' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders') && hasTakeProfit ? (
                  /* Per Fintokei, FundingPips e FundingTraders con "Primo giorno completato?" = Si, mostra direttamente i campi input */
                  <div className="space-y-3 sm:space-y-4">
                    <input
                      type="number"
                      value={profittoRisultato || ''}
                      onChange={(e) => setProfittoRisultato(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                      placeholder="Profitto..."
                    />
                    <input
                      type="number"
                      value={capitalePropRisultato || ''}
                      onChange={(e) => setCapitalePropRisultato(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                      placeholder="Capitale prop..."
                    />
                  </div>
                ) : risultatoSelezionato === '' && (
                  <>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Seleziona il risultato:</p>
                    <div className="space-y-2 sm:space-y-3">
                      <button onClick={() => setRisultatoSelezionato('Stop loss')} className="w-full bg-red-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm sm:text-base">
                        Stop loss
                      </button>
                      <button onClick={() => setRisultatoSelezionato('Take profit')} className="w-full bg-green-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-md text-sm sm:text-base">
                        Take profit
                      </button>
                    </div>
                  </>
                )}

                {risultatoSelezionato === 'Stop loss' && (
                  <>
                    {currentSheet === 'FundingTraders' ? (
                      // Per FundingTraders, comportamento specifico per operazione
                      <>
                        {operazione === 2 ? (
                          // Operazione "Successiva": Stop loss mostra congratulazioni
                          <div className="text-center">
                            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                            <p className="text-base sm:text-lg font-semibold mb-2">Ben fatto!</p>
                            <p className="text-sm sm:text-base text-gray-600">Ci vediamo domani.</p>
                          </div>
                        ) : (
                          // Operazione "Prima": Stop loss permette inserimento dati
                          <div className="space-y-3 sm:space-y-4">
                            <input
                              type="number"
                              value={profittoRisultato || ''}
                              onChange={(e) => setProfittoRisultato(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                              placeholder="Profitto..."
                            />
                            <input
                              type="number"
                              value={capitalePropRisultato || ''}
                              onChange={(e) => setCapitalePropRisultato(e.target.value)}
                              className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                              placeholder="Capitale prop..."
                            />
                          </div>
                        )}
                      </>
                    ) : (currentSheet === 'FundedNext' || currentSheet === 'OneFunded' || currentSheet === 'MasterFunders' || currentSheet === 'FundingPips' || currentSheet === 'Audacity Capital') ? (
                      // Per FundedNext, OneFunded, MasterFunders, FundingPips e Dragon: Stop loss mostra sempre congratulazioni
                      <div className="text-center">
                        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                        <p className="text-base sm:text-lg font-semibold mb-2">Ben fatto!</p>
                        <p className="text-sm sm:text-base text-gray-600">Ci vediamo domani.</p>
                      </div>
                    ) : (currentSheet === 'The5ers' && hasTakeProfit) ? (
                      // Per The5ers con "2 take profit" = "Si": Stop loss mostra congratulazioni
                      <div className="text-center">
                        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                        <p className="text-base sm:text-lg font-semibold mb-2">Ben fatto!</p>
                        <p className="text-sm sm:text-base text-gray-600">Ci vediamo domani.</p>
                      </div>
                    ) : operazione === 2 ? (
                      // Per tutti gli altri fogli: operazione "Successiva" mostra congratulazioni
                      <div className="text-center">
                        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                        <p className="text-base sm:text-lg font-semibold mb-2">Ben fatto!</p>
                        <p className="text-sm sm:text-base text-gray-600">Ci vediamo domani.</p>
                      </div>
                    ) : (
                      // Operazione "Prima" o The5ers con !hasTakeProfit: permette inserimento dati
                      <div className="space-y-3 sm:space-y-4">
                        <input
                          type="number"
                          value={profittoRisultato || ''}
                          onChange={(e) => setProfittoRisultato(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                          placeholder="Profitto..."
                        />
                        <input
                          type="number"
                          value={capitalePropRisultato || ''}
                          onChange={(e) => setCapitalePropRisultato(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                          placeholder="Capitale prop..."
                        />
                      </div>
                    )}
                  </>
                )}

                {risultatoSelezionato === 'Take profit' && (
                  <>
                    {operazione === 2 || ((currentSheet === 'The5ers' || currentSheet === 'Fintokei' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders') && !hasTakeProfit) ? (
                      <div className="text-center">
                        <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
                        <p className="text-base sm:text-lg font-semibold mb-2">Ben fatto!</p>
                        <p className="text-sm sm:text-base text-gray-600">Ci vediamo domani.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        <input
                          type="number"
                          value={profittoRisultato || ''}
                          onChange={(e) => setProfittoRisultato(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                          placeholder="Profitto..."
                        />
                        <input
                          type="number"
                          value={capitalePropRisultato || ''}
                          onChange={(e) => setCapitalePropRisultato(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm sm:text-base"
                          placeholder="Capitale prop..."
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                  {(risultatoSelezionato !== '' || currentSheet === 'OneFunded' || (currentSheet === 'Fintokei' && hasTakeProfit) || (currentSheet === 'FundingTraders' && hasTakeProfit) || (currentSheet === 'FundingPips' && hasTakeProfit)) && (
                    <button onClick={() => {
                      if (currentSheet === 'OneFunded' || (currentSheet === 'Fintokei' && hasTakeProfit) || (currentSheet === 'FundingTraders' && hasTakeProfit) || (currentSheet === 'FundingPips' && hasTakeProfit)) {
                        // Per OneFunded, Fintokei, FundingTraders e FundingPips con hasTakeProfit, Annulla chiude il popup
                        setShowRisultatiPopup(false);
                      }
                      setRisultatoSelezionato(''); 
                      setProfittoRisultato(''); 
                      setCapitalePropRisultato('');
                    }} className="flex-1 bg-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base">
                      {(currentSheet === 'OneFunded' || (currentSheet === 'Fintokei' && hasTakeProfit) || (currentSheet === 'FundingTraders' && hasTakeProfit) || (currentSheet === 'FundingPips' && hasTakeProfit)) ? 'Annulla' : '← Indietro'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      let waitingForConfirmation = false;
                      
                      // Logica per OneFunded
                      if (currentSheet === 'OneFunded') {
                        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
                        const sogliaBassa = capitaleDefault * (-0.03);
                        const profitto = Number(profittoRisultato) || 0;
                        
                        // Soglia alta diversa per Fase 1 e Fase 2
                        const sogliaAlta = fase === 1 ? capitaleDefault * 0.03 : capitaleDefault * 0.015;
                        
                        // Controlla se profitto è fuori range
                        if (profitto > sogliaAlta || profitto <= sogliaBassa) {
                          // Mostra "Ben fatto ci vediamo domani" senza implementare dati
                          setFintokeiConfermaMessage('onefunded-domani');
                          setShowFintokeiConfermaPopup(true);
                          waitingForConfirmation = true;
                        } else {
                          // Implementa normalmente
                          setOperazione(2);
                          setProfittoOggi(profitto);
                          if (capitalePropRisultato) setCapitaleSuProp(Number(capitalePropRisultato));
                          setShowRisultatiPopup(false);
                          setRisultatoSelezionato('');
                          setProfittoRisultato('');
                          setCapitalePropRisultato('');
                        }
                      }
                      // Logica specifica per Fintokei Fase 1 o Fase 2 con "Primo giorno completato?" = Si
                      else if (currentSheet === 'Fintokei' && hasTakeProfit && (fase === 1 || fase === 2)) {
                        const moltiplicatori = [1, 2, 4, 10, 20];
                        const moltiplicatore = moltiplicatori[livelloUtente - 1];
                        
                        const profitto = Number(profittoRisultato) || 0;
                        const capitale = Number(capitalePropRisultato) || 0;
                        
                        // Soglie proporzionali per livello
                        const sogliaProfittoNegativo = -200 * moltiplicatore;
                        const sogliaCapitaleBasso = 4550 * moltiplicatore;
                        // Soglia capitale alto diversa per fase 1 e fase 2
                        const sogliaCapitaleAlto = fase === 1 ? 5400 * moltiplicatore : 5300 * moltiplicatore;
                        
                        // Controlla le condizioni
                        if (profitto <= sogliaProfittoNegativo || capitale <= sogliaCapitaleBasso) {
                          // Mostra "Ben fatto ci vediamo domani"
                          setFintokeiConfermaMessage('domani');
                          setShowFintokeiConfermaPopup(true);
                        } else if (capitale >= sogliaCapitaleAlto) {
                          // Mostra "Ben fatto sei in fase 2!" o "Ben fatto sei in fase real!"
                          setFintokeiConfermaMessage(fase === 1 ? 'fase2' : 'fasereal');
                          setShowFintokeiConfermaPopup(true);
                        } else {
                          // Caso normale: aggiorna i valori, passa a operazione successiva e chiudi
                          setOperazione(2);
                          setProfittoOggi(profitto);
                          if (capitalePropRisultato) setCapitaleSuProp(capitale);
                          setShowRisultatiPopup(false);
                          setRisultatoSelezionato('');
                          setProfittoRisultato('');
                          setCapitalePropRisultato('');
                        }
                      }
                      // Logica per Fintokei altre fasi o hasTakeProfit = false
                      else if (currentSheet === 'Fintokei' && hasTakeProfit) {
                        // Aggiorna profitto e capitale prop e passa a operazione successiva
                        setOperazione(2);
                        setProfittoOggi(Number(profittoRisultato) || 0);
                        if (capitalePropRisultato) setCapitaleSuProp(Number(capitalePropRisultato));
                        setShowRisultatiPopup(false);
                        setRisultatoSelezionato('');
                        setProfittoRisultato('');
                        setCapitalePropRisultato('');
                      }
                      // Logica per FundingTraders con hasTakeProfit
                      else if (currentSheet === 'FundingTraders' && hasTakeProfit) {
                        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
                        const sogliaProfitto = capitaleDefault * (-0.03);
                        const sogliaCapitale = capitaleDefault * 1.1;
                        
                        const profitto = Number(profittoRisultato) || 0;
                        const capitale = Number(capitalePropRisultato) || capitaleDefault;
                        
                        // Controlli
                        if (profitto < sogliaProfitto || capitale >= sogliaCapitale) {
                          // Mostra "Ben fatto ci vediamo domani" senza implementare dati
                          setFintokeiConfermaMessage('fundingtraders-domani');
                          setShowFintokeiConfermaPopup(true);
                          waitingForConfirmation = true;
                        } else {
                          // Implementa normalmente
                          setOperazione(2);
                          setProfittoOggi(profitto);
                          if (capitalePropRisultato) setCapitaleSuProp(capitale);
                          setShowRisultatiPopup(false);
                          setRisultatoSelezionato('');
                          setProfittoRisultato('');
                          setCapitalePropRisultato('');
                        }
                      }
                      // Logica per FundingPips con hasTakeProfit
                      else if (currentSheet === 'FundingPips' && hasTakeProfit) {
                        const capitaleDefault = getCapitalTiers(currentSheet)[livelloUtente - 1];
                        const sogliaProfitto = capitaleDefault * (-0.03);
                        const sogliaCapitale = capitaleDefault * 1.1;
                        
                        const profitto = Number(profittoRisultato) || 0;
                        const capitale = Number(capitalePropRisultato) || capitaleDefault;
                        
                        // Controlli
                        if (profitto < sogliaProfitto || capitale >= sogliaCapitale) {
                          // Mostra "Ben fatto ci vediamo domani" senza implementare dati
                          setFintokeiConfermaMessage('fundingpips-domani');
                          setShowFintokeiConfermaPopup(true);
                          waitingForConfirmation = true;
                        } else {
                          // Implementa normalmente
                          setOperazione(2);
                          setProfittoOggi(profitto);
                          if (capitalePropRisultato) setCapitaleSuProp(capitale);
                          setShowRisultatiPopup(false);
                          setRisultatoSelezionato('');
                          setProfittoRisultato('');
                          setCapitalePropRisultato('');
                        }
                      }
                      // Logica specifica per FundingTraders
                      else if (currentSheet === 'FundingTraders' && operazione === 1) {
                        if (risultatoSelezionato === 'Take profit') {
                          // Take profit → Operazione "Successiva" (2)
                          setOperazione(2);
                          setProfittoOggi(Number(profittoRisultato) || 133);
                          if (capitalePropRisultato) setCapitaleSuProp(Number(capitalePropRisultato));
                        } else if (risultatoSelezionato === 'Stop loss') {
                          // Stop loss → Operazione "Successiva" (2)
                          setOperazione(2);
                          setProfittoOggi(Number(profittoRisultato) || 133);
                          if (capitalePropRisultato) setCapitaleSuProp(Number(capitalePropRisultato));
                        }
                      }
                      // Logica per The5ers con Stop loss quando !hasTakeProfit
                      else if (currentSheet === 'The5ers' && risultatoSelezionato === 'Stop loss' && !hasTakeProfit) {
                        // Aggiorna i valori e sposta su operazione "Successiva"
                        setOperazione(2);
                        setProfittoOggi(Number(profittoRisultato) || 0);
                        if (capitalePropRisultato) setCapitaleSuProp(Number(capitalePropRisultato));
                      }
                      // Logica per altri provider (comportamento originale)
                      else if (risultatoSelezionato === 'Take profit' && operazione === 1 && !((currentSheet === 'The5ers' || currentSheet === 'Fintokei') && !hasTakeProfit)) {
                        setOperazione(2);
                        setProfittoOggi(Number(profittoRisultato) || 133);
                        if (capitalePropRisultato) setCapitaleSuProp(Number(capitalePropRisultato));
                      }
                      // Chiudi popup solo se non siamo in attesa del popup di conferma Fintokei o OneFunded
                      if (!(currentSheet === 'Fintokei' && hasTakeProfit && (fase === 1 || fase === 2)) && !waitingForConfirmation) {
                        setShowRisultatiPopup(false);
                        setRisultatoSelezionato('');
                        setProfittoRisultato('');
                        setCapitalePropRisultato('');
                      }
                    }}
                    className="flex-1 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base"
                  >
                    {(currentSheet === 'OneFunded' || (risultatoSelezionato === 'Take profit' && operazione === 1) || (risultatoSelezionato === 'Stop loss' && currentSheet === 'FundingTraders' && operazione === 1) || (risultatoSelezionato === 'Stop loss' && currentSheet === 'The5ers' && !hasTakeProfit) || ((currentSheet === 'Fintokei' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders') && hasTakeProfit)) && !((currentSheet === 'Fintokei' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders') && !hasTakeProfit) ? 'Conferma' : 'Chiudi'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Popup Conferma Fintokei Fase 1 e Fase 2 */}
          {showFintokeiConfermaPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto text-center">
                <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                <p className="text-lg sm:text-xl font-semibold mb-2">Ben fatto!</p>
                <p className="text-base sm:text-lg text-gray-600">
                  {fintokeiConfermaMessage === 'domani' ? 'Ci vediamo domani.' :
                   fintokeiConfermaMessage === 'onefunded-domani' ? 'Ci vediamo domani.' :
                   fintokeiConfermaMessage === 'fundingtraders-domani' ? 'Ci vediamo domani.' :
                   fintokeiConfermaMessage === 'fundingpips-domani' ? 'Ci vediamo domani.' : 
                   fintokeiConfermaMessage === 'fase2' ? 'Sei in fase 2!' : 
                   'Sei in fase real!'}
                </p>
                <button
                  onClick={() => {
                    // Comportamento diverso per OneFunded, FundingTraders e FundingPips quando profitto/capitale è fuori range
                    if (fintokeiConfermaMessage === 'onefunded-domani' || 
                        fintokeiConfermaMessage === 'fundingtraders-domani' || 
                        fintokeiConfermaMessage === 'fundingpips-domani') {
                      // NON implementare i dati, solo chiudere i popup
                      setShowFintokeiConfermaPopup(false);
                      setShowRisultatiPopup(false);
                      setRisultatoSelezionato('');
                      setProfittoRisultato('');
                      setCapitalePropRisultato('');
                      setFintokeiConfermaMessage('');
                    } else {
                      // Comportamento normale per Fintokei
                      // Aggiorna i valori
                      setProfittoOggi(Number(profittoRisultato) || 0);
                      if (capitalePropRisultato) setCapitaleSuProp(Number(capitalePropRisultato));
                      
                      // Passa a operazione successiva
                      setOperazione(2);
                      
                      // Cambia fase solo se il messaggio è fase2
                      if (fintokeiConfermaMessage === 'fase2') {
                        setFase(2);
                      }
                      // Per fasereal non cambiamo fase, è solo un messaggio di congratulazioni
                      
                      // Chiudi tutti i popup
                      setShowFintokeiConfermaPopup(false);
                      setShowRisultatiPopup(false);
                      setRisultatoSelezionato('');
                      setProfittoRisultato('');
                      setCapitalePropRisultato('');
                      setFintokeiConfermaMessage('');
                    }
                  }}
                  className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          )}

          {/* Popup Info FundedNext, MasterFunders, FundingTraders, FundingPips e The5ers */}
          {showInfoPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-4 sm:p-5 w-full max-w-sm mx-auto shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-700">Info Challenge</h3>
                  <button 
                    onClick={() => setShowInfoPopup(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="font-semibold text-blue-800 mb-1 text-sm">Nome Challenge</h4>
                    <p className="text-blue-700 font-medium text-sm">
                      {currentSheet === 'FundedNext' ? 'Stellar Lite' : 
                       currentSheet === 'OneFunded' ? 'flex 2 step' : 
                       currentSheet === 'MasterFunders' ? 'Core Challenge' : 
                       currentSheet === 'FundingTraders' ? 'PRO10' : 
                       currentSheet === 'FundingPips' ? 'Funding Pips' : 
                       currentSheet === 'Fintokei' ? 'Pro Trader' : 
                       currentSheet === 'Audacity Capital' ? 'Ability challenge' : 'High Stakes'}
                    </p>
                  </div>
                  
                  {(currentSheet === 'FundedNext' || currentSheet === 'OneFunded' || currentSheet === 'MasterFunders' || currentSheet === 'FundingPips' || currentSheet === 'FundingTraders' || currentSheet === 'The5ers' || currentSheet === 'Fintokei' || currentSheet === 'Audacity Capital') && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h4 className="font-semibold text-blue-800 mb-1 text-sm">Dimensione challenge</h4>
                      <p className="text-blue-700 font-medium text-sm">
                        ${currentSheet === 'The5ers' 
                          ? [5000, 10000, 20000, 60000, 100000][livelloUtente - 1].toLocaleString()
                          : currentSheet === 'Fintokei'
                          ? [5000, 10000, 20000, 50000, 100000][livelloUtente - 1].toLocaleString()
                          : getCapitalTiers(currentSheet)[livelloUtente - 1].toLocaleString()
                        }
                      </p>
                    </div>
                  )}
                  
                  {currentSheet === 'FundingPips' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Step</h4>
                          <p className="text-blue-700 text-sm">2</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Piattaforma</h4>
                          <p className="text-blue-700 text-sm">MT5</p>
                        </div>
                      </div>
                    </>
                  ) : currentSheet === 'MasterFunders' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Piattaforma</h4>
                          <p className="text-blue-700 text-sm">Piattaforma interna</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Add-on</h4>
                          <p className="text-blue-700 text-sm">No</p>
                        </div>
                      </div>
                    </>
                  ) : currentSheet === 'The5ers' ? (
                    <>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-1 text-sm">Piattaforma</h4>
                        <p className="text-blue-700 text-sm">MT5</p>
                      </div>
                    </>
                  ) : currentSheet === 'Fintokei' ? (
                    <>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-1 text-sm">Piattaforma</h4>
                        <p className="text-blue-700 text-sm">MT5</p>
                      </div>
                    </>
                  ) : currentSheet === 'Audacity Capital' ? (
                    <>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-1 text-sm">Piattaforma</h4>
                        <p className="text-blue-700 text-sm">MT5</p>
                      </div>
                    </>
                  ) : currentSheet === 'FundingTraders' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Step</h4>
                          <p className="text-blue-700 text-sm">2</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Piattaforma</h4>
                          <p className="text-blue-700 text-sm">MT5</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Profit Split</h4>
                          <p className="text-blue-700 text-sm">80%</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5">
                          <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Payout</h4>
                          <p className="text-blue-700 text-sm">14 days</p>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Trading Conditions</h4>
                        <p className="text-blue-700 text-sm">Only no commissions</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-2.5">
                        <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Add-on</h4>
                        <p className="text-blue-700 text-sm">No</p>
                      </div>
                      
                      {/* Prezzo dinamico in base alla percentuale selezionata */}
                      {(() => {
                        const price = getFundingTradersPrice(fundingTradersPercentage, livelloUtente);
                        return price !== null ? (
                          <div className="bg-blue-50 rounded-lg p-2.5">
                            <h4 className="font-semibold text-blue-800 mb-0.5 text-sm">Prezzo</h4>
                            <p className="text-blue-700 text-sm font-bold">${price}</p>
                          </div>
                        ) : null;
                      })()}
                    </>
                  ) : (currentSheet === 'FundedNext' || currentSheet === 'OneFunded') ? (
                    <>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-1 text-sm">Piattaforma</h4>
                        <p className="text-blue-700 text-sm">MT5</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-semibold text-blue-800 mb-1 text-sm">Add-on</h4>
                        <p className="text-blue-700 text-sm">
                          {currentSheet === 'OneFunded' 
                            ? 'Nessun giorno minimo di negoziazione + Sconto 10%' 
                            : 'Nessun giorno minimo di negoziazione'}
                        </p>
                      </div>
                    </>
                  ) : null}
                  
                  {/* Prezzo generico (nascosto per FundingTraders che ha prezzo dinamico) */}
                  {currentSheet !== 'FundingTraders' && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h4 className="font-semibold text-blue-800 mb-1 text-sm">Prezzo</h4>
                      <p className="text-blue-700 font-bold text-lg">
                        {currentSheet === 'FundedNext' 
                          ? ['$38', '$71', '$167', '$275', '$479'][livelloUtente - 1]
                          : currentSheet === 'OneFunded'
                          ? ['$49', '$96', '$135', '$211', '$390'][livelloUtente - 1]
                          : currentSheet === 'MasterFunders'
                          ? ['$40', '$75', '$170', '$319', '$549'][livelloUtente - 1]
                          : currentSheet === 'FundingPips'
                          ? ['$36', '$66', '$156', '$289', '$529'][livelloUtente - 1]
                          : currentSheet === 'Fintokei'
                          ? ['-', '-', '$159', '$319', '$529'][livelloUtente - 1]
                          : currentSheet === 'Audacity Capital'
                          ? ['$49', '$90', '$230', '$320', '$540'][livelloUtente - 1]
                          : ['$39', '$78', '$165', '$329', '$545'][livelloUtente - 1]
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowInfoPopup(false)}
                  className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Chiudi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default TradingCalculator;