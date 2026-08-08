// Neutralise `server-only` sous vitest : le vrai paquet est fourni par Next
// au build et lève dès qu'il est résolu hors d'un contexte serveur. Les tests
// tournent en environnement node, donc l'invariant est déjà respecté.
export {};
