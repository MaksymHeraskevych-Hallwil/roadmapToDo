#!/bin/sh
# Оновлює список IP-діапазонів Cloudflare.
#
# Запускати руками час від часу (або з cron) — Cloudflare зрідка
# додає нові діапазони. Якщо список застаріє, запити з нових діапазонів
# перестануть вважатись «від Cloudflare»: у логах буде IP їхнього
# сервера замість клієнтського, а в режимі CLOUDFLARE_ONLY вони
# отримають 403.
set -e

OUT="$(dirname "$0")/cloudflare-ips.txt"

{
  echo "# Опубліковані діапазони Cloudflare. Оновити: ./update-cloudflare-ips.sh"
  echo "# Знімок від $(date +%Y-%m-%d)"
  curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4
  echo
  curl -fsS --max-time 20 https://www.cloudflare.com/ips-v6
  echo
} > "$OUT.tmp"

# Проста перевірка, що ми не записали порожнечу або HTML-помилку
if [ "$(grep -c '/' "$OUT.tmp")" -lt 10 ]; then
  echo "Схоже, завантажився не той вміст — лишаю старий список" >&2
  rm -f "$OUT.tmp"
  exit 1
fi

mv "$OUT.tmp" "$OUT"
echo "Оновлено: $OUT ($(grep -c '/' "$OUT") діапазонів)"
echo "Не забудь перезібрати nginx: docker compose up -d --build nginx"
