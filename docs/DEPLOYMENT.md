# Deployment

## Hetzner Cloud Server

### Server einrichten

```bash
# Ubuntu 24.04 LTS
apt update && apt upgrade -y
apt install docker.io docker-compose-plugin -y

# Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Deployment

```bash
# Repository klonen
git clone https://github.com/[org]/dpsg-reisekosten.git
cd dpsg-reisekosten

# Environment einrichten
cp .env.example .env
nano .env  # → Produktionswerte eintragen

# Starten
docker compose -f docker-compose.yml up -d

# Datenbank migrieren
docker compose exec app npx prisma migrate deploy
```

### SSL mit Traefik

Siehe `docker/docker-compose.prod.yml` für die Produktion mit Traefik und Let's Encrypt.
