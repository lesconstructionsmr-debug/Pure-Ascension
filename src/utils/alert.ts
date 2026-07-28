/**
 * Alertes multi-plateformes.
 *
 * `Alert.alert` de react-native-web est une méthode vide : sur le build web,
 * tous les messages d'erreur, permissions et confirmations disparaissent
 * silencieusement. Ce helper les rend visibles partout.
 */
import { Alert, Platform } from 'react-native';

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as never);
    return;
  }

  const body = message ? `${title}\n\n${message}` : title;
  const cancelBtn = buttons?.find((b) => b.style === 'cancel');
  const actionBtns = (buttons ?? []).filter((b) => b.style !== 'cancel');

  // Information simple : pas de choix à faire
  if (actionBtns.length === 0) {
    window.alert(body);
    cancelBtn?.onPress?.();
    return;
  }

  const primary = actionBtns[actionBtns.length - 1];

  if (!cancelBtn && actionBtns.length === 1) {
    window.alert(body);
    primary.onPress?.();
    return;
  }

  const confirmed = window.confirm(`${body}\n\n« OK » : ${primary.text}`);
  if (confirmed) primary.onPress?.();
  else (cancelBtn ?? actionBtns[0]).onPress?.();
}
