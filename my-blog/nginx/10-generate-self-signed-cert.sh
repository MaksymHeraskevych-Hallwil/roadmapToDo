#!/bin/sh
# Генеруємо self-signed сертифікат для локальної розробки,
# якщо в /etc/nginx/certs ще нічого немає.
#
# У проді сюди треба підкласти справжній сертифікат (наприклад,
# від Let's Encrypt), просто змонтувавши теку з хоста —
# скрипт тоді нічого не перезаписує.
set -e

CERT_DIR=/etc/nginx/certs
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

mkdir -p "$CERT_DIR"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "[nginx] Сертифікат уже існує — генерацію пропускаємо"
  exit 0
fi

echo "[nginx] Генерую self-signed сертифікат для ${SSL_DOMAIN:-localhost}..."

openssl req -x509 -nodes -newkey rsa:2048 \
  -days 365 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/C=UA/ST=Kyiv/L=Kyiv/O=MyBlog/CN=${SSL_DOMAIN:-localhost}" \
  -addext "subjectAltName=DNS:${SSL_DOMAIN:-localhost},DNS:127.0.0.1,IP:127.0.0.1"

chmod 600 "$KEY_FILE"

echo "[nginx] Готово. Браузер покаже попередження — це нормально для self-signed."
