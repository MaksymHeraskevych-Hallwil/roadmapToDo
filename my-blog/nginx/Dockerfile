FROM nginx:alpine

# openssl потрібен, щоб згенерувати self-signed сертифікат
# для локального https, якщо справжнього сертифіката немає.
RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf
COPY cloudflare-ips.txt /etc/nginx/cloudflare-ips.txt

# Усе, що лежить у /docker-entrypoint.d/, офіційний образ nginx
# виконує перед стартом самого nginx. Номери задають порядок:
# спершу генеруємо конфіги Cloudflare, потім сертифікат.
COPY 05-cloudflare.sh /docker-entrypoint.d/05-cloudflare.sh
COPY 10-generate-self-signed-cert.sh /docker-entrypoint.d/10-generate-self-signed-cert.sh
RUN chmod +x /docker-entrypoint.d/05-cloudflare.sh \
             /docker-entrypoint.d/10-generate-self-signed-cert.sh

EXPOSE 80 443
