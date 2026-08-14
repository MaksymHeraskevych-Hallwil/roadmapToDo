#!/bin/sh
# Генерує два конфіги nginx зі списку діапазонів Cloudflare.
# Виконується автоматично при старті контейнера (docker-entrypoint.d).
set -e

SRC=/etc/nginx/cloudflare-ips.txt
REALIP=/etc/nginx/cf-realip.conf
ALLOW=/etc/nginx/cf-allow.conf

# Тільки рядки з CIDR, без коментарів і порожніх
RANGES=$(grep '/' "$SRC" | grep -v '^#')

# Додаткові довірені мережі через пробіл.
# Потрібно при роботі через Cloudflare Tunnel: cloudflared стукає в
# nginx із docker-мережі, а не з діапазонів Cloudflare, тож без цього
# справжній IP клієнта не відновиться.
# Приклад: EXTRA_REAL_IP_RANGES="172.16.0.0/12"
RANGES="$RANGES $EXTRA_REAL_IP_RANGES"

# ── 1. Відновлення справжнього IP клієнта ──────────────────────────
#
# Коли сайт стоїть за Cloudflare, до nginx приходить IP їхнього
# сервера, а не відвідувача. Справжній лежить у заголовку
# CF-Connecting-IP.
#
# Ключова деталь безпеки: nginx довіряє цьому заголовку ТІЛЬКИ якщо
# з'єднання прийшло з адреси у set_real_ip_from. Інакше будь-хто міг би
# підробити заголовок і обійти обмеження за IP.
{
  echo "# Згенеровано автоматично скриптом 05-cloudflare.sh"
  for range in $RANGES; do
    echo "set_real_ip_from $range;"
  done
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$REALIP"

# ── 2. Режим «пускати тільки Cloudflare» ───────────────────────────
#
# Якщо домен пропущений через Cloudflare, а origin при цьому лишається
# доступним за своїм IP напряму, — захист обходиться в один рядок curl.
# Цей режим закриває origin для всіх, крім Cloudflare.
#
# Вмикається змінною CLOUDFLARE_ONLY=true у docker-compose.yml.
# За замовчуванням вимкнено — інакше зламався б локальний доступ.
if [ "$CLOUDFLARE_ONLY" = "true" ]; then
  {
    echo "# Доступ дозволено тільки з мереж Cloudflare"
    for range in $RANGES; do
      echo "allow $range;"
    done
    echo "deny all;"
  } > "$ALLOW"
  echo "[nginx] CLOUDFLARE_ONLY увімкнено — origin закритий для прямих запитів"
else
  echo "# CLOUDFLARE_ONLY вимкнено — обмежень за IP немає" > "$ALLOW"
fi
