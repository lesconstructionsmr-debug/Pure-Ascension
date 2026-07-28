$text = @"
Bonjour Natasha,

Voici les livrables complets du tunnel d'acquisition et de conversion pour Pure Ascension :

1. PLAN DE CAMPAGNES DE TRAFIC (Meta Ads & Google Ads) :
- Structuration Meta Ads (Cold & Lookalike 1-3%) et Google Search / PMax.
- Copies publicitaires avec Hooks et directives visuelles luxe (Sauge, Sable, Encre, Terre Cuite).
- Fichier : C:\Users\WARRIORS666\Desktop\Pure_Ascension_Funnel_Docs\1_traffic_campaigns_plan.md

2. SÉQUENCE AUTOMATISÉE E-MAIL & SMS :
- Séquence de relance J+0 à J+7 (Emails 1 à 5) en copywriting haut de gamme sans naturopathie et sans prix fixes.
- 3 SMS de rappel percutants (< 160 caractères).
- Fichier : C:\Users\WARRIORS666\Desktop\Pure_Ascension_Funnel_Docs\2_drip_campaign_sequence.md

3. LEAD MAGNET - BILAN MÉTABOLIQUE & ANTI-INFLAMMATOIRE EXPRESS :
- Guide d'hygiène de vie et de vitalité cellulaire.
- Auto-évaluation en 5 critères pour calculer le Score de Vitalité (/25).
- Fichier : C:\Users\WARRIORS666\Desktop\Pure_Ascension_Funnel_Docs\3_lead_magnet_guide.md

4. ARCHITECTURE DU TUNNEL & TRACKING CRO :
- Schéma logique étape par étape et plan de tracking des événements (Meta Pixel, GA4, Mixpanel, Stripe).
- Fichier : C:\Users\WARRIORS666\Desktop\Pure_Ascension_Funnel_Docs\4_funnel_architecture.md

Tous les documents sont disponibles sur le Bureau :
C:\Users\WARRIORS666\Desktop\Pure_Ascension_Funnel_Docs\
"@

Set-Clipboard -Value $text
$wshell = New-Object -ComObject WScript.Shell
$activated = $wshell.AppActivate('Slack')
if (-not $activated) {
  $activated = $wshell.AppActivate('Tools')
}

if ($activated) {
  Start-Sleep -Milliseconds 500
  $wshell.SendKeys('^v')
  Start-Sleep -Milliseconds 400
  $wshell.SendKeys('{ENTER}')
  Write-Output 'SUCCESS_PASTED_TO_SLACK'
} else {
  Write-Output 'SLACK_WINDOW_NOT_FOUND'
}
