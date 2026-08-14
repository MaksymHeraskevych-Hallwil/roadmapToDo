# Cloudflare: що вже зроблено і що лишилось зробити тобі

Cloudflare — зовнішній сервіс, а не пакет у проєкті. Він працює як
проксі **перед** твоїм сервером: DNS вказує на Cloudflare, той фільтрує
трафік і передає далі на origin (наш NGINX).

```
відвідувач → Cloudflare (WAF, DDoS, кеш) → NGINX → frontend / backend
```

Тому робота ділиться навпіл: половина в репозиторії (зроблено),
половина — кліки в панелі Cloudflare і володіння доменом (за тобою).

---

## Якщо домену немає

Без домену **захист Cloudflare налаштувати неможливо**. WAF, Bot Fight
Mode, rate limiting rules, кеш-правила — це все налаштування *зони*,
тобто домену в твоєму акаунті. Немає домену → немає зони → немає де це
вмикати.

Доступний лише **quick tunnel**: тимчасова публічна адреса на твій
локальний Docker, без акаунта й без домену.

```bash
export COMPOSE_FILE=docker-compose.yml:docker-compose.cloudflare.yml

docker compose up -d
docker compose logs cloudflared-quick | grep trycloudflare.com
```

У логах буде рядок з адресою виду `https://якісь-слова.trycloudflare.com`.
Вона працює, поки живий контейнер; після рестарту буде інша.

**Чому `COMPOSE_FILE`, а не `-f` щоразу.** Compose не запамʼятовує, з
якими файлами ти піднімав стек: без прапорців він читає тільки
`docker-compose.yml` і на `logs cloudflared-quick` відповість
`no such service`, хоча контейнер працює. Змінна `COMPOSE_FILE` задає
набір файлів один раз на сесію терміналу — далі всі команди
(`logs`, `ps`, `down`) працюють як звичайно.

Без змінної доводиться писати повністю щоразу:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml logs cloudflared-quick
```

| Що дає | Чого не дає |
| --- | --- |
| публічний HTTPS з валідним сертифікатом | WAF і керовані правила |
| мережа Cloudflare перед твоєю машиною | rate limiting rules у панелі |
| працює за NAT, порти відкривати не треба | захист від ботів |
| зручно показати проєкт замовнику чи ментору | стабільну адресу |

Захист у цьому режимі — тільки той, що в нашому nginx: обмеження
частоти запитів і ліміт зʼєднань. Це вже непогано проти примітивного
перебору паролів, але це не «система захисту Cloudflare».

Зупинити (у тому ж терміналі, де виставлений `COMPOSE_FILE`):

```bash
docker compose down
```

Перевірити ззовні, що тунель справді працює:

```bash
curl -sI https://твоя-адреса.trycloudflare.com/ | grep -i cf-ray
```

Заголовок `cf-ray` означає, що запит пройшов через мережу Cloudflare.

Усе, що нижче, потребує домену.

---

## Частина 1. Що вже налаштовано в репозиторії

### Відновлення справжнього IP клієнта

За проксі до origin приходить IP сервера Cloudflare, а не відвідувача.
Справжній лежить у заголовку `CF-Connecting-IP`.

Файл `cf-realip.conf` генерується при старті контейнера зі списку
`nginx/cloudflare-ips.txt` і містить `set_real_ip_from` для кожного
діапазону Cloudflare.

**Чому це не діра в безпеці:** NGINX довіряє заголовку тільки якщо саме
з'єднання прийшло з адреси у `set_real_ip_from`. Підроблений
`CF-Connecting-IP` від стороннього клієнта просто ігнорується —
перевірено, в лог пише реальний IP відправника.

Оновити список діапазонів (Cloudflare зрідка додає нові):

```bash
./nginx/update-cloudflare-ips.sh && docker compose up -d --build nginx
```

### Обмеження частоти запитів

| Роут | Ліміт | Навіщо |
| --- | --- | --- |
| `/api/auth/login`, `/api/auth/register` | 5/хв, burst 3 | перебір паролів |
| `/api/*` | 30/с, burst 60 | загальний захист від флуду |
| будь-який | 20 одночасних з'єднань з IP | вичерпання конекшенів |

Перевищення → `429`. Це **друга лінія** після Cloudflare: WAF на краю
не допоможе, якщо хтось знайшов IP origin і б'є напряму.

Порядок у конфізі має значення: `include cf-realip.conf` стоїть **до**
`limit_req_zone`. Інакше ліміт рахувався б на IP серверів Cloudflare —
і один зловмисник блокував би всіх, хто зайшов через ту саму точку.

### Режим «пускати тільки Cloudflare»

`CLOUDFLARE_ONLY: 'true'` у `docker-compose.yml` закриває origin для
всіх, крім мереж Cloudflare (перевірено: прямий запит → `403`).

Вмикати **після** того, як домен уже працює через Cloudflare. І не
вмикати в режимі тунелю — там `cloudflared` приходить із docker-мережі.

### Cloudflare Tunnel

Сервіс `cloudflared` у `docker-compose.yml` дає підключити локальний
стек до Cloudflare **без публічного IP і без відкритих портів** —
підключення йде зсередини назовні. Не стартує зі звичайним `up`:

```bash
docker compose --profile cloudflare up -d
```

---

## Частина 2. Що робиш ти (потрібен домен і акаунт)

### Крок 1. Домен у Cloudflare

Додати сайт, змінити NS-записи у реєстратора на ті, що видасть
Cloudflare. Поширення — до доби.

### Крок 2. Проксування

У розділі DNS запис твого домену має бути з **помаранчевою хмаркою**
(Proxied). Сіра хмарка = DNS без захисту, весь сенс втрачається.

### Крок 3. SSL/TLS — найважливіший крок

Режим шифрування постав **Full (strict)**.

| Режим | Що робить | Вердикт |
| --- | --- | --- |
| Off | без шифрування | ні |
| Flexible | відвідувач ↔ CF шифровано, **CF ↔ origin відкрито** | **ніколи** |
| Full | шифровано скрізь, сертифікат origin не перевіряється | прийнятно |
| Full (strict) | шифровано скрізь + перевірка сертифіката | **так** |

`Flexible` небезпечний тим, що виглядає безпечним: у браузері замок є,
а половина шляху йде відкритим текстом.

Для `Full (strict)` потрібен довірений сертифікат на origin. Наш
самопідписаний не підійде — візьми **Origin Certificate** (SSL/TLS →
Origin Server → Create Certificate), поклади файли як `server.crt` і
`server.key` і підключи том у `docker-compose.yml`:

```yaml
volumes:
  - ./nginx/certs:/etc/nginx/certs:ro
```

Скрипт генерації самопідписаного побачить наявні файли й не чіпатиме їх.

### Крок 4. Захист

| Розділ | Що ввімкнути |
| --- | --- |
| Security → WAF | Managed Rules (базовий набір OWASP) |
| Security → Bots | Bot Fight Mode |
| Security → WAF → Rate limiting | правило на `/api/auth/*` |
| SSL/TLS → Edge Certificates | Always Use HTTPS, HSTS |

### Крок 5. Кешування

У Caching → Cache Rules переконайся, що `/api/*` **не кешується** —
інакше Cloudflare почне віддавати чужі відповіді API різним людям.
Статику Next.js (`/_next/static/*`) кешувати можна й треба.

### Крок 6. Закрити origin

Коли все працює через домен — постав `CLOUDFLARE_ONLY: 'true'` і
перезапусти nginx. Інакше сайт лишається доступним за прямим IP в обхід
усього захисту.

---

## Якщо йдеш через Tunnel

1. Zero Trust → Networks → Tunnels → Create a tunnel → Docker.
2. З показаної команди скопіюй токен (після `--token`) у `.env`:
   `CLOUDFLARE_TUNNEL_TOKEN=...`
3. Public hostname: домен → сервіс `https://nginx:443`,
   у налаштуваннях увімкни **No TLS Verify** (сертифікат самопідписаний).
4. `docker compose --profile cloudflare up -d`
5. У `docker-compose.yml` для nginx постав
   `EXTRA_REAL_IP_RANGES: '172.16.0.0/12'` — інакше в логах буде IP
   контейнера замість клієнтського.
6. `CLOUDFLARE_ONLY` лишається `false`.

Перевага: порти 80/443 назовні можна взагалі не відкривати.

---

## Швидка перевірка

```bash
# заголовок CF-Connecting-IP не підробляється сторонніми
curl -sk https://localhost/api/health -H "CF-Connecting-IP: 1.2.3.4"
docker compose logs nginx --tail=1   # має бути реальний IP, не 1.2.3.4

# rate limit працює
for i in $(seq 1 12); do curl -sk -o /dev/null -w "%{http_code} " \
  -X POST https://localhost/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x@y.com","password":"w"}'; done
# очікується: кілька 401, далі 429

# після підключення домену — чи справді трафік іде через Cloudflare
curl -sI https://твій-домен/ | grep -i "cf-ray\|server"
```

Заголовок `cf-ray` у відповіді означає, що запит пройшов через
Cloudflare. Немає — значить проксування не ввімкнене.
