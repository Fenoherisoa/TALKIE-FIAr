# TALKIE TECH — Application Talkie-Walkie Web Local PTT

Application React (TypeScript + Vite + Tailwind CSS) de communication audio Push-To-Talk (PTT) directe en temps réel, inspirée de la version native Android TALKIE TECH (RFC OFFICE).

## Fonctionnalités

- **Audio PTT PCM 16 kHz Mono** : capture micro et lecture en temps réel via l'API Web Audio.
- **Canal virtuel & Identifiant configurables** : communication cloisonnée par canal (ex. `TECH-01`) et pseudo personnalisable.
- **Modes de fonctionnement** :
  - *ÉMETTEUR + RÉCEPTEUR* (Transceiver bidirectionnel)
  - *ÉMETTEUR uniquement* (Diffusion seule)
  - *RÉCEPTEUR uniquement* (Écoute seule)
- **Protocole radio TT01** : trames de paquets avec en-tête `TT01|<canal>|<utilisateur>|\n` et données audio PCM.
- **Effets sonores authentiques** : Bip de prise de parole (Chirp PTT), filtre de bande radio et Roger Beep ("Over") avec squelch de fin de transmission.
- **Diffusion directe locale / multi-onglets** : utilisation de `BroadcastChannel` pour une communication sans latence entre postes et onglets sur le même réseau local.
- **VU-mètre & Visualiseur audio** : affichage en direct du niveau sonore TX et RX.
- **Journal des transmissions** : historique des appels émis et reçus avec durée et horodatage.
- **Générateur de test radio** : simulation intégrée de transmission (Centrale RFC) pour tester la restitution sonore sans nécessiter de second appareil.

## Utilisation

1. Connectez les appareils ou ordinateurs au même réseau Wi-Fi local ou point d'accès mobile (aucun accès Internet requis).
2. Lancez l'application (`npm run dev`).
3. Autorisez l'accès au microphone lors de la demande.
4. Définissez votre nom d'utilisateur et rejoignez le même canal virtuel que vos correspondants.
5. Cliquez sur **SE CONNECTER AU WI-FI LOCAL**.
6. Maintenez enfoncé **MAINTENIR POUR PARLER** (ou la barre d'espace) pour émettre, puis relâchez pour écouter.
