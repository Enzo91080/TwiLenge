# Backlog

## [FEAT] Intégration Channel Points Twitch
**Objectif :** Permettre aux viewers de déclencher des actions via les points de chaîne Twitch.

**Comportement attendu :**
- Lorsqu'un viewer échange des points de chaîne sur une récompense configurée, une action se déclenche dans l'app (ex. : activer un défi, faire tourner la roue, etc.)
- Le streameur configure depuis le dashboard quelle récompense Twitch correspond à quelle action
- L'intégration passe par l'EventSub déjà en place (`channel.channel_points_custom_reward_redemption.add`)

---

## [FEAT] Roue de défis aléatoire (Spin Wheel)
**Objectif :** Permettre au streameur de faire tourner une roue en live pour sélectionner aléatoirement le prochain défi.

**Comportement attendu :**
- La roue affiche les défis disponibles (non complétés, non ignorés)
- Le streameur la déclenche depuis le dashboard ou via Channel Points
- Une animation tourne et s'arrête sur un défi
- Le défi sélectionné devient le défi actif (`/api/session/spin` existe déjà côté serveur)
- L'animation est visible sur l'overlay OBS
