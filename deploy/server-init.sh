#!/bin/bash
set -euo pipefail
echo "═══ DPSG Reisekosten — Server Setup ═══"

echo "[1/8] System aktualisieren..."
apt update && apt upgrade -y

echo "[2/8] Pakete installieren..."
apt install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades git

echo "[3/8] Docker installieren..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "[4/8] Benutzer 'deploy' erstellen..."
if ! id -u deploy &>/dev/null; then
  useradd -m -s /bin/bash -G docker,sudo deploy
  echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
  echo "→ Setze ein Passwort fuer deploy:"
  passwd deploy
fi

echo "[5/8] SSH absichern..."
sed -i 's/#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

echo "[6/8] Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

echo "[7/8] Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'F2B'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
[sshd]
enabled = true
F2B
systemctl enable fail2ban && systemctl restart fail2ban

echo "[8/8] Automatische Sicherheitsupdates..."
dpkg-reconfigure -plow unattended-upgrades

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "════════════════════════════════════════════════"
echo "  Server-Setup abgeschlossen!"
echo ""
echo "  Naechste Schritte:"
echo "  1. SSH-Key fuer 'deploy' einrichten:"
echo "     ssh-copy-id deploy@$SERVER_IP"
echo "  2. Einloggen: ssh deploy@$SERVER_IP"
echo "  3. Projekt klonen und starten (siehe deploy.sh)"
echo "════════════════════════════════════════════════"
