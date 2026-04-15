// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE UTENTI - Trading Calculator
// ═══════════════════════════════════════════════════════════════════════
// 
// Questo file contiene tutte le credenziali e permessi degli utenti.
// Per aggiungere/modificare utenti, edita questo file invece del componente principale.
//
// ═══════════════════════════════════════════════════════════════════════

/**
 * CREDENZIALI UTENTI
 * 
 * Formato: { 'username': 'password' }
 * 
 * Per aggiungere un nuovo utente:
 * 1. Aggiungi una riga qui con username e password
 * 2. Aggiungi i permessi in USER_LEVEL_PERMISSIONS qui sotto
 */
export const DEFAULT_CREDENTIALS = {
  'FPia': '500',
  'AZuc': '1000',
  'GCos': '1000',
  'GAlberati': '500',
  'Nick': '2500',
  'Rini': '2500',
  'Angelo': '2500',
  '3': '2500',
  '1': '1'
};

/**
 * PERMESSI LIVELLI UTENTI
 * 
 * Formato: { 'username': [livelli_permessi] }
 * 
 * Livelli disponibili: 1, 2, 3, 4, 5
 * 
 * Esempi:
 * - [1] = Solo livello 1
 * - [2, 3] = Livelli 2 e 3
 * - [1, 2, 3, 4, 5] = Tutti i livelli (admin)
 * 
 * Per modificare i permessi:
 * Cambia l'array dei livelli per l'utente desiderato
 */
export const USER_LEVEL_PERMISSIONS = {
  'FPia': [2, 3],           // Livelli 2 e 3
  'AZuc': [2],              // Solo livello 2
  'GCos': [2],              // Solo livello 2
  'GAlberati': [1],         // Solo livello 1
  'Nick': [3, 4],           // Livelli 3 e 4
  'Rini': [3],              // Solo livello 3
  'Angelo': [3],            // Solo livello 3
  '3': [3, 4],              // Livelli 3 e 4
  '1': [1, 2, 3, 4, 5]      // Tutti i livelli (admin)
};

// ═══════════════════════════════════════════════════════════════════════
// GUIDA RAPIDA
// ═══════════════════════════════════════════════════════════════════════
//
// AGGIUNGERE UN NUOVO UTENTE:
// ---------------------------
// 1. Aggiungi in DEFAULT_CREDENTIALS:
//    'NuovoUtente': 'password123',
//
// 2. Aggiungi in USER_LEVEL_PERMISSIONS:
//    'NuovoUtente': [1, 2, 3],  // Livelli che può usare
//
// MODIFICARE PASSWORD:
// --------------------
// Trova l'utente in DEFAULT_CREDENTIALS e cambia la password
//
// MODIFICARE PERMESSI:
// --------------------
// Trova l'utente in USER_LEVEL_PERMISSIONS e cambia l'array dei livelli
//
// RIMUOVERE UN UTENTE:
// --------------------
// Cancella la riga sia in DEFAULT_CREDENTIALS che in USER_LEVEL_PERMISSIONS
//
// ═══════════════════════════════════════════════════════════════════════
